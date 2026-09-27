import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptPaymentBreakdown } from "../../src/utils/account-book/transactionDetail.ts";

test("receipt detail parses stored payment evidence without inventing legacy values", () => {
    assert.deepEqual(parseReceiptPaymentBreakdown(null), []);
    assert.deepEqual(parseReceiptPaymentBreakdown("not-json"), []);
    assert.deepEqual(parseReceiptPaymentBreakdown('{"amount":"10"}'), []);
    assert.deepEqual(parseReceiptPaymentBreakdown('[{"paymentType":"LOYALTY_POINTS","amount":"2069","evidence":"ポイント支払","duplicateGroup":null}]'), [{
        paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント支払", duplicateGroup: null,
    }]);
});
