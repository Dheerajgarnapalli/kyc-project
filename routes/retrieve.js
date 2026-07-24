const express = require("express");
const router = express.Router();

const bucket = require("../gcs");

router.post("/", async (req, res) => {
    try {

        const { customerDid } = req.body;

        if (!customerDid) {
            return res.status(400).json({
                success: false,
                message: "customerDid is required"
            });
        }

        // Read users.json
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

        // Check if customer exists
        const customer = users.find(
            user => user.customerDid === customerDid
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        const folder = `customers/${customerDid.replace(/:/g, "_")}/`;

        const [files] = await bucket.getFiles({
            prefix: folder
        });

        // Ignore customer.json
        const documentFiles = files.filter(file =>
            !file.name.endsWith("customer.json")
        );

        if (documentFiles.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Customer found but no documents uploaded.",
                customerDid,
                name: customer.name,
                email: customer.email,
                bankName: customer.bankName,
                documents: []
            });
        }

        const documents = await Promise.all(
            documentFiles.map(async (file) => {

                const [url] = await file.getSignedUrl({
                    version: "v4",
                    action: "read",
                    expires: Date.now() + 15 * 60 * 1000 // 15 minutes
                });

                return {
                    fileName: file.name.split("/").pop(),
                    url
                };

            })
        );

        res.status(200).json({
            success: true,
            message: "Documents retrieved successfully.",
            customerDid,
            name: customer.name,
            email: customer.email,
            bankName: customer.bankName,
            documents
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

module.exports = router;