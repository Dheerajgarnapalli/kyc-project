const express = require("express");
const router = express.Router();

const crypto = require("crypto");
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

        const documents = [];

        for (const file of documentFiles) {

            const fileName = file.name.split("/").pop();

            // Download file from bucket
            const [buffer] = await file.download();

            // Generate SHA256
            const currentHash = crypto
                .createHash("sha256")
                .update(buffer)
                .digest("hex");

            // Stored hash
            const storedHash =
                customer.documents?.[fileName]?.hash;

            if (!storedHash) {

                return res.status(400).json({
                    success: false,
                    message: `Hash not found for ${fileName}`
                });

            }

            // Compare hashes
            if (storedHash !== currentHash) {

                return res.status(403).json({
                    success: false,
                    message: `Document tampered: ${fileName}`
                });

            }

            // Generate signed URL only after verification
            const [url] = await file.getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + 15 * 60 * 1000
            });

            documents.push({
                fileName,
                hashVerified: true,
                url
            });

        }

        res.status(200).json({
            success: true,
            message: "All documents verified successfully.",
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