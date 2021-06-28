const PollingStation = artifacts.require("PollingStation");

module.exports = function(deployer) {
    deployer.deploy(PollingStation);
}