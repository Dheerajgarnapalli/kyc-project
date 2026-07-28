const express = require("express");
const router = express.Router();

const bucket = require("../gcs");

router.get("/", async (req, res) => {

    try {

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

        const customers = users.map(user => ({
            customerDid: user.customerDid,
            name: user.name,
            email: user.email,
            kycStatus: user.kycStatus || "Unverified"
        }));

        return res.status(200).json({
            success: true,
            count: customers.length,
            customers
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