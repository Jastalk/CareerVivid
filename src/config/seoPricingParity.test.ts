import { describe, expect, it } from 'vitest';
import { getSearchPage } from '../../functions/src/seo/searchIndexPolicy';
import { SUBSCRIPTION_CATALOG } from './subscriptionCatalog';
import { ENTERPRISE_MINIMUM_SEATS, PLAN_MONTHLY_CREDITS } from '@shared/credits';

/*
 * /pricing used to serve Googlebot 58 words containing no prices at all, which
 * is why it was indexed and ranked for nothing. It now quotes the real numbers.
 *
 * They are quoted as WORDS, not computed: that copy is rendered by a Cloud
 * Function, and SUBSCRIPTION_CATALOG lives in the web bundle, so the function
 * cannot import it. That makes drift possible — a price changes here and the
 * page keeps advertising the old one to search results, which is the kind of
 * mistake nobody notices until a customer quotes it back.
 *
 * So the drift is made loud. Change a price and this fails, naming the copy
 * that still has to be updated.
 *
 * This test lives on the web side because the functions tsconfig has no path
 * mapping for `@shared/*`; searchIndexPolicy.ts is pure data with no imports,
 * so reading it from here costs nothing.
 */

const pricing = JSON.stringify(getSearchPage('/pricing'));

describe('the pricing page quotes what CareerVivid actually charges', () => {
    it('quotes the Pro price, monthly and annual', () => {
        expect(pricing).toContain(`$${SUBSCRIPTION_CATALOG.pro.monthlyPrice}/month`);
        expect(pricing).toContain(`$${SUBSCRIPTION_CATALOG.pro.annualMonthlyEquivalent}/month billed annually`);
    });

    it('quotes the Max price, monthly and annual', () => {
        expect(pricing).toContain(`$${SUBSCRIPTION_CATALOG.max.monthlyPrice}/month`);
        expect(pricing).toContain(`$${SUBSCRIPTION_CATALOG.max.annualMonthlyEquivalent}/month billed annually`);
    });

    it('quotes the Enterprise price and its seat minimum', () => {
        expect(pricing).toContain(`$${SUBSCRIPTION_CATALOG.enterprise.monthlyPrice} per seat/month`);
        expect(pricing).toContain(`minimum ${ENTERPRISE_MINIMUM_SEATS} seats`);
    });

    it('quotes the monthly credit allowance of every plan', () => {
        expect(pricing).toContain(`${PLAN_MONTHLY_CREDITS.free} credits`);
        expect(pricing).toContain(`${PLAN_MONTHLY_CREDITS.pro.toLocaleString('en-US')} credits`);
        expect(pricing).toContain(`${PLAN_MONTHLY_CREDITS.max.toLocaleString('en-US')} credits`);
        expect(pricing).toContain(`${PLAN_MONTHLY_CREDITS.enterprise.toLocaleString('en-US')} credits per seat`);
    });

    /*
     * The free plan is described as a working product rather than a trial, so
     * the claim has to stay true: 100 credits, all 36 templates, no credit card.
     */
    it('does not promise a free plan that does not exist', () => {
        expect(PLAN_MONTHLY_CREDITS.free).toBeGreaterThan(0);
        expect(pricing).toContain('No credit card is required');
    });
});
