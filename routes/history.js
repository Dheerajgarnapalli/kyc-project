const express = require("express");
const router = express.Router();

const bucket = require("../gcs");

const VALID_STATES = [
    "KYC Verified",
    "KYC Fetched"
];

router.post("/", async (req, res) => {

    try {

        const {
            customerDid,
            status,
            productType
        } = req.body;

        if (!customerDid || !status || !productType) {
            return res.status(400).json({
                success: false,
                message: "customerDid, status and productType are required"
            });
        }

        if (!VALID_STATES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values are: ${VALID_STATES.join(", ")}`
            });
        }

        const usersFile = bucket.file("users/users.json");

        const [exists] = await usersFile.exists();

        if (!exists) {
            return res.status(404).json({
                success: false,
                message: "No registered customers found."
            });
        }

        const [contents] = await usersFile.download();
        const users = JSON.parse(contents.toString());

        const userIndex = users.findIndex(
            user => user.customerDid === customerDid
        );

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        if (!users[userIndex].kycHistory) {
            users[userIndex].kycHistory = [];
        }

        const historyEntry = {
            status,
            productType,
            timestamp: new Date().toISOString()
        };

        users[userIndex].kycHistory.push(historyEntry);

        await usersFile.save(
            JSON.stringify(users, null, 2),
            {
                contentType: "application/json"
            }
        );

        return res.status(200).json({
            success: true,
            message: "KYC history updated successfully.",
            customerDid,
            history: historyEntry
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;