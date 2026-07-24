const express = require("express");

const registerRoute = require("./routes/register");
const uploadRoute = require("./routes/upload");
const retrieveRoute = require("./routes/retrieve");


const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to KYC Server"
    });
});

app.use("/register", registerRoute);
app.use("/upload", uploadRoute);
app.use("/retrieve", retrieveRoute);

// Use the port provided by Google Cloud, or 8000 for local development
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});