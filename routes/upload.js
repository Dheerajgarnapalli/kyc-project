const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

// Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket("kyc-documents-team14");

// Temporary uploads folder
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir
});

router.post("/", upload.single("document"), async (req, res) => {
    try {
        const customerDid = req.body.customerDid;

        if (!customerDid) {
            return res.status(400).json({
                success: false,
                message: "Customer DID is required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // Replace ":" because folder names use "_"
        const customerFolder = customerDid.replace(/:/g, "_");

        // Check if customer exists
        const customerFile = bucket.file(
            `customers/${customerFolder}/customer.json`
        );

        const [exists] = await customerFile.exists();

        if (!exists) {
            // Remove temporary file
            fs.unlinkSync(req.file.path);

            return res.status(404).json({
                success: false,
                message: "Invalid Customer DID. Customer not found."
            });
        }

        // Upload document to Cloud Storage
        const destination = `customers/${customerFolder}/${req.file.originalname}`;

        await bucket.upload(req.file.path, {
            destination: destination
        });

        // Delete temporary file
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            success: true,
            message: "Document uploaded successfully",
            customerDid: customerDid,
            fileName: req.file.originalname,
            bucketPath: destination
        });

    } catch (err) {

        // Delete temp file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
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