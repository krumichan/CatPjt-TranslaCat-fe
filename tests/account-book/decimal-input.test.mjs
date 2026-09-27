import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveDecimalInput, isPositiveDecimal } from "../../src/utils/account-book/decimalInput.ts";

test("formatted goal amounts become exact decimal request strings", () => {
    for (const [input, expected] of [["12,345.67", "12345.67"], [" 9,007,199,254,740,993.125 ", "9007199254740993.125"], ["10.125", "10.125"], ["12000", "12000"], ["0.00000001", "0.00000001"]]) {
        assert.equal(parsePositiveDecimalInput(input), expected);
        assert.equal(typeof parsePositiveDecimalInput(input), "string");
    }
});

test("zero, negative, nondecimal and nonfinite money inputs cannot be submitted", () => {
    for (const input of ["", "0", "0.00", "-1", "NaN", "Infinity", "1e20", "1.2.3", ".", "10."]) {
        assert.equal(isPositiveDecimal(input), false, input);
        assert.equal(parsePositiveDecimalInput(input), null, input);
    }
});
