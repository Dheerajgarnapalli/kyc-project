const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bucket = require("../gcs");

// Temporary uploads folder
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir
});

router.post("/", upload.array("documents", 10), async (req, res) => {

    try {

        const customerDid = req.body.customerDid;

        if (!customerDid) {
            return res.status(400).json({
                success: false,
                message: "Customer DID is required"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No documents uploaded"
            });
        }

        const customerFolder = customerDid.replace(/:/g, "_");

        // Check customer exists
        const customerFile = bucket.file(
            `customers/${customerFolder}/customer.json`
        );

        const [exists] = await customerFile.exists();

        if (!exists) {

            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(404).json({
                success: false,
                message: "Invalid Customer DID. Customer not found."
            });
        }

        // Read users.json
        const usersFile = bucket.file("users/users.json");

        const [usersContents] = await usersFile.download();

        const users = JSON.parse(usersContents.toString());

        const userIndex = users.findIndex(
            user => user.customerDid === customerDid
        );

        if (userIndex === -1) {

            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(404).json({
                success: false,
                message: "Customer not found in users.json"
            });
        }

        if (!users[userIndex].documents) {
            users[userIndex].documents = {};
        }

        const uploadedDocuments = [];

        // Process each uploaded file
        for (const file of req.files) {

            // Generate SHA-256 hash
            const fileBuffer = fs.readFileSync(file.path);

            const fileHash = crypto
                .createHash("sha256")
                .update(fileBuffer)
                .digest("hex");

            // Upload to GCS
            const destination =
                `customers/${customerFolder}/${file.originalname}`;

            await bucket.upload(file.path, {
                destination
            });

            // Save hash in users.json
            users[userIndex].documents[file.originalname] = {
                hash: fileHash,
                uploadedAt: new Date().toISOString()
            };

            uploadedDocuments.push({
                fileName: file.originalname,
                bucketPath: destination,
                hash: fileHash
            });

            // Delete local temp file
            fs.unlinkSync(file.path);
        }

        // Save updated users.json
        await usersFile.save(
            JSON.stringify(users, null, 2),
            {
                contentType: "application/json"
            }
        );

        res.status(200).json({
            success: true,
            message: "Documents uploaded successfully",
            customerDid,
            documents: uploadedDocuments
        });

    } catch (err) {

        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: err.message
        });
    }

});

module.exports = router;