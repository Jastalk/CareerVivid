import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Securely create an order server-side.
 * Validates prices from the database to prevent client-side manipulation.
 */
export const createOrder = functions
    .region('us-west1')
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
        // 1. Authentication Check
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be logged in to place an order.'
            );
        }

        const { dropId, items } = data;
        const userId = context.auth.uid;

        // 2. Input Validation
        if (!dropId || !items || !Array.isArray(items) || items.length === 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Order must contain a dropId and a list of items.'
            );
        }

        try {
            // 3. Verify Drop Status
            const dropRef = db.collection('drops').doc(dropId);
            const dropSnap = await dropRef.get();

            if (!dropSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Drop not found.');
            }

            const dropData = dropSnap.data();
            if (dropData?.status !== 'open' && dropData?.status !== 'locked') {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'This drop is not currently accepting orders.'
                );
            }

            // 4. Calculate Totals & Verify Prices
            let calculatedTotal = 0;
            const orderItems = [];

            // Parallel fetch for all products
            // Optimization: In a real app, you might cache prices or use map
            const productPromises = items.map(async (item: { productId: string; quantity: number }) => {
                if (item.quantity <= 0) return null;

                const productRef = db.collection('products').doc(item.productId);
                const productSnap = await productRef.get();

                if (!productSnap.exists) {
                    throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found.`);
                }

                const productData = productSnap.data();
                const price = productData?.price || 0;

                // Security: ensure we use the DB price, not client price
                const lineTotal = price * item.quantity;
                calculatedTotal += lineTotal;

                return {
                    product_id: item.productId,
                    quantity: item.quantity,
                    name: productData?.name || 'Unknown Item',
                    price: price, // Store snapshot price
                    image_url: productData?.image_url || null
                };
            });

            const resolvedItems = await Promise.all(productPromises);
            const validItems = resolvedItems.filter(Boolean);

            if (validItems.length === 0) {
                throw new functions.https.HttpsError('invalid-argument', 'No valid items in order.');
            }

            // 5. Create Order Document
            const orderData = {
                user_id: userId,
                drop_id: dropId,
                items: validItems,
                total_amount: calculatedTotal,
                status: 'confirmed', // Or 'pending_payment' if linking Stripe later
                payment_status: 'pending', // Secure default
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                zone_id: 'urbana' // Ideally fetched from user profile
            };

            const orderRef = await db.collection('orders').add(orderData);

            console.log(`Order created securely: ${orderRef.id} for user ${userId}. Total: $${calculatedTotal}`);

            return { success: true, orderId: orderRef.id, total: calculatedTotal };

        } catch (error: any) {
            console.error("Order Creation Error:", error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError('internal', error.message);
        }
    });
