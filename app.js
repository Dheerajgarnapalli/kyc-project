const express = require("express");
const cors = require("cors");

const registerRoute = require("./routes/register");
const uploadRoute = require("./routes/upload");
const retrieveRoute = require("./routes/retrieve");
const loginRoute = require("./routes/login");

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to KYC Server"
    });
});

app.use("/register", registerRoute);
app.use("/upload", uploadRoute);
app.use("/retrieve", retrieveRoute);
app.use("/login", loginRoute);

// Use the port provided by Google Cloud, or 8000 for local development
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});