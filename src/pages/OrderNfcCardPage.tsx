import React, { useState, useRef } from 'react';
import { Upload, Info, Check, ArrowLeft, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { uploadImage } from '../services/storageService';

const OrderNfcCardPage: React.FC = () => {
    const { t } = useTranslation();
    const tOrder = (key: string, options?: Record<string, unknown>) => t(`nfc_order.${key}`, options);
    const { currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<'custom' | 'standard'>('custom');
    const [selectedColor, setSelectedColor] = useState<'black' | 'white'>('black');
    const [quantity, setQuantity] = useState<number>(1);
    const [location, setLocation] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [options, setOptions] = useState({
        matchLogo: false,
        includeQR: true,
        metalSurface: false,
        iosAppClip: false
    });

    // Stripe Price IDs
    const PRODUCTS = {
        custom: {
            id: 'price_1So67jRJNflGxv32TKsC7AbX',
            price: 12.90
        },
        standard: {
            id: 'price_1So6AtRJNflGxv32qHMPnhwz',
            price: 9.89
        }
    };

    const METAL_SURFACE_PRICE = 0.50;

    const calculateTotal = () => {
        let basePrice = PRODUCTS[selectedType].price;
        if (options.metalSurface) basePrice += METAL_SURFACE_PRICE;
        return (basePrice * quantity).toFixed(2);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert(tOrder('alerts.file_too_large'));
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                if (file.size > 5 * 1024 * 1024) {
                    alert(tOrder('alerts.file_too_large'));
                    return;
                }
                setLogoFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const removeLogo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCheckout = async () => {
        if (!currentUser) {
            navigate('/signin?redirect=/order-nfc-card');
            return;
        }

        if (selectedType === 'custom' && !logoFile) {
            alert(tOrder('alerts.logo_required'));
            return;
        }

        setIsLoading(true);
        try {
            let logoUrl = '';

            // Upload logo if present (for Custom cards)
            if (selectedType === 'custom' && logoFile) {
                const timestamp = Date.now();
                const path = `orders/${currentUser.uid}/${timestamp}_${logoFile.name}`;
                try {
                    logoUrl = await uploadImage(logoFile, path);
                } catch (uploadError) {
                    console.error("Logo upload failed:", uploadError);
                    alert(tOrder('alerts.logo_upload_failed'));
                    setIsLoading(false);
                    return;
                }
            }

            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

            const result: any = await createCheckoutSession({
                priceId: PRODUCTS[selectedType].id,
                quantity: quantity,
                successUrl: `${window.location.origin}/order-nfc-card?success=true`,
                cancelUrl: `${window.location.origin}/order-nfc-card`,
                metadata: {
                    type: selectedType,
                    color: selectedColor,
                    location: location,
                    includeQR: options.includeQR ? 'yes' : 'no',
                    metalSurface: options.metalSurface ? 'yes' : 'no',
                    matchLogo: options.matchLogo ? 'yes' : 'no',
                    iosAppClip: options.iosAppClip ? 'yes' : 'no',
                    logoUrl: logoUrl,
                    userId: currentUser.uid
                }
            });

            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
                console.error('No URL returned from checkout session creation');
                alert(tOrder('alerts.checkout_missing_url'));
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert(tOrder('alerts.checkout_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const steps = [
        { number: 1, label: tOrder('steps.design'), active: true },
        { number: 2, label: tOrder('steps.shipping'), active: false },
        { number: 3, label: tOrder('steps.confirmation'), active: false },
        { number: 4, label: tOrder('steps.tap_tag_actions'), active: false },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/business-card')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{tOrder('header.back_to_business_card')}</span>
                    </button>
                    <div className="font-semibold text-gray-900">{tOrder('header.title')}</div>
                    <div className="w-24"></div> {/* Spacer for centering */}
                </div>
            </div>

            <div className="max-w-6xl mx-auto py-12 px-6 md:px-12">
                {/* Step Progress Bar */}
                <div className="flex items-center justify-center gap-4 mb-12 overflow-x-auto pb-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step.active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {step.number}
                                </span>
                                <span className={`text-sm font-medium ${step.active ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="w-16 h-px bg-gray-300 min-w-[40px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Form - Left 2 columns */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Section Title */}
                        <h2 className="text-3xl font-bold text-gray-900">{tOrder('select_title')}</h2>

                        {/* Product Cards */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Custom Card */}
                            <button
                                onClick={() => setSelectedType('custom')}
                                className={`p-6 rounded-xl border-2 text-left transition-all ${selectedType === 'custom' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                                <div className="w-16 h-16 bg-gray-900 rounded-full mb-4 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{tOrder('product.custom.badge')}</span>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900">{tOrder('product.custom.title')}</h3>
                                    <span className="font-semibold text-gray-900">{tOrder('price_each', { price: PRODUCTS.custom.price.toFixed(2) })}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {tOrder('product.custom.description')}
                                </p>
                            </button>

                            {/* Standard Card */}
                            <button
                                onClick={() => {
                                    setSelectedType('standard');
                                    setLogoFile(null);
                                    setLogoPreview(null);
                                }}
                                className={`p-6 rounded-xl border-2 text-left transition-all relative ${selectedType === 'standard' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                                <span className="absolute top-4 right-4 px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                                    {tOrder('product.standard.badge')}
                                </span>
                                <div className="w-16 h-16 bg-gray-400 rounded-full mb-4 flex items-center justify-center">
                                    <span className="text-white text-xs">{tOrder('product.standard.icon_label')}</span>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900">{tOrder('product.standard.title')}</h3>
                                    <span className="font-semibold text-gray-900">{tOrder('price_each', { price: PRODUCTS.standard.price.toFixed(2) })}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {tOrder('product.standard.description')}
                                </p>
                            </button>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">{tOrder('color.label')}</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedColor('black')}
                                    className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${selectedColor === 'black' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                                >
                                    <span className="w-4 h-4 rounded-full bg-gray-900" />
                                    <span className="text-sm font-medium">{tOrder('color.black')}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedColor('white')}
                                    className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${selectedColor === 'white' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                                >
                                    <span className="w-4 h-4 rounded-full bg-white border border-gray-300" />
                                    <span className="text-sm font-medium">{tOrder('color.white')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        {selectedType === 'custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">{tOrder('logo.label')}</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-white"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png,image/jpeg,image/svg+xml"
                                        className="hidden"
                                    />
                                    {logoPreview ? (
                                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                                            <img src={logoPreview} alt={tOrder('logo.preview_alt')} className="h-32 object-contain mx-auto" />
                                            <button
                                                onClick={removeLogo}
                                                aria-label={tOrder('logo.remove')}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <p className="text-sm text-indigo-600 mt-2 font-medium">{logoFile?.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                                            <p className="text-gray-600">{tOrder('logo.drop_prompt')}</p>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {tOrder('logo.recommendation')}
                                </p>
                            </div>
                        )}

                        {/* Options */}
                        <div className="space-y-4">
                            {/* Match Logo */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setOptions(prev => ({ ...prev, matchLogo: !prev.matchLogo }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${options.matchLogo ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${options.matchLogo ? 'left-7' : 'left-1'}`} />
                                </button>
                                <div>
                                    <p className="font-medium text-gray-900">{tOrder('options.match_logo.title')}</p>
                                    <p className="text-sm text-gray-500">{tOrder('options.match_logo.description')}</p>
                                </div>
                            </div>

                            {/* Include QR */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setOptions(prev => ({ ...prev, includeQR: !prev.includeQR }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${options.includeQR ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${options.includeQR ? 'left-7' : 'left-1'}`} />
                                </button>
                                <div>
                                    <p className="font-medium text-gray-900">{tOrder('options.include_qr.title')}</p>
                                    <p className="text-sm text-gray-500">{tOrder('options.include_qr.description')}</p>
                                </div>
                            </div>

                            {/* Metal Surfaces */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setOptions(prev => ({ ...prev, metalSurface: !prev.metalSurface }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${options.metalSurface ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${options.metalSurface ? 'left-7' : 'left-1'}`} />
                                </button>
                                <div>
                                    <p className="font-medium text-gray-900">{tOrder('options.metal_surface.title')}</p>
                                    <p className="text-sm text-gray-500">{tOrder('options.metal_surface.description', { price: METAL_SURFACE_PRICE.toFixed(2) })}</p>
                                </div>
                            </div>

                            {/* iOS App Clip */}
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setOptions(prev => ({ ...prev, iosAppClip: !prev.iosAppClip }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${options.iosAppClip ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${options.iosAppClip ? 'left-7' : 'left-1'}`} />
                                </button>
                                <div>
                                    <p className="font-medium text-gray-900">{tOrder('options.ios_app_clip.title')}</p>
                                    <p className="text-sm text-gray-500">{tOrder('options.ios_app_clip.description')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quantity Section */}
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{tOrder('quantity.title')}</h3>
                            <p className="text-gray-500 mb-6">{tOrder('quantity.description')}</p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{tOrder('quantity.location_label')}</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder={tOrder('quantity.location_placeholder')}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{tOrder('quantity.quantity_label')}</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Notice */}
                        <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <Info className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <p className="text-sm text-gray-600">
                                {tOrder('notice')}
                            </p>
                        </div>
                    </div>

                    {/* Order Summary - Right column */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            {/* Preview */}
                            <div className="text-center">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">{tOrder('summary.preview')}</p>
                                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center shadow-xl transition-all ${selectedColor === 'black' ? 'bg-gray-900' : 'bg-white border-8 border-gray-100'}`}>
                                    <div className="text-center">
                                        <p className={`text-xs font-bold leading-tight ${selectedColor === 'black' ? 'text-white' : 'text-gray-900'}`}>
                                            {tOrder('summary.preview_lines.line1')}<br />{tOrder('summary.preview_lines.line2')}<br />{tOrder('summary.preview_lines.line3')}<br />{tOrder('summary.preview_lines.line4')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">{tOrder('summary.title')}</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{selectedType === 'custom' ? tOrder('summary.custom_tags') : tOrder('summary.standard_tags')}</span>
                                        <span className="font-medium">${PRODUCTS[selectedType].price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{tOrder('summary.quantity')}</span>
                                        <span className="font-medium">{quantity}</span>
                                    </div>
                                    {options.metalSurface && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{tOrder('summary.metal_surface_add_on')}</span>
                                            <span className="font-medium">+${(METAL_SURFACE_PRICE * quantity).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{tOrder('summary.sales_tax')}</span>
                                        <span className="font-medium">$0.00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{tOrder('summary.shipping')}</span>
                                        <span className="font-medium text-green-600">{tOrder('summary.free')}</span>
                                    </div>
                                    <hr className="my-2" />
                                    <div className="flex justify-between text-lg">
                                        <span className="font-bold text-gray-900">{tOrder('summary.total')}</span>
                                        <span className="font-bold text-gray-900">${calculateTotal()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={isLoading}
                                    className="w-full mt-6 px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {tOrder('summary.processing')}
                                        </>
                                    ) : (
                                        tOrder('summary.next')
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderNfcCardPage;
