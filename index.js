require('dotenv').config();
const mongo = require('mongodb');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const shortId = require('shortid');
const validUrl = require('valid-url');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cors());
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));

// MongoDB Connection
const URI = process.env.MONGO_URI;
mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, "connection error:"));
connection.once('open', () => {
  console.log("Database connection successful");
});

// Define Mongoose Schema and Model
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
});
const URL = mongoose.model("URL", urlSchema);

// Serve the homepage
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Example API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// API to shorten URLs
app.post('/api/shorturl', async function (req, res) {
  const url = req.body.url;
  const urlCode = shortId.generate();

  // Validate URL
  if (!validUrl.isWebUri(url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Check if URL already exists in database
    let findOne = await URL.findOne({ original_url: url });

    if (findOne) {
      // If URL exists, return existing entry
      return res.json({
        original_url: findOne.original_url,
        short_url: findOne.short_url
      });
    } else {
      // Create a new shortened URL entry
      const newUrl = new URL({
        original_url: url,
        short_url: urlCode
      });

      await newUrl.save();
      return res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Redirect to original URL
app.get('/api/shorturl/:short_url', async function (req, res) {
  const shortUrl = req.params.short_url;

  try {
    const findOne = await URL.findOne({ short_url: shortUrl });

    if (findOne) {
      return res.redirect(findOne.original_url);
    } else {
      return res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Start the server
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
