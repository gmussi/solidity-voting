async function shouldThrow(promise, msg) {
    try {
        await promise;
        assert(true);
    }
    catch (err) {
        return;
    }
    assert(false, msg ? msg : "The contract did not throw.");

}

module.exports = {
    shouldThrow,
};