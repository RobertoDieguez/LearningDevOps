const express = require("express");
const cors = require("cors");
const redis = require("redis");
const axios = require("axios");

const app = express();

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-undef
const REDISHOST = process.env.REDISHOST || "localhost";
// eslint-disable-next-line no-undef
const REDISPORT = process.env.REDISPORT || 6379;

const redisClient = redis.createClient(REDISPORT, {
  host: REDISHOST,
  connect_timeout: 3000,
});
redisClient.on("error", () => {
  console.log("Failed connecting to redis server");
});

const API = "https://jsonplaceholder.typicode.com";

app.use(cors());

app.get("/", async (req, res) => {
  if (redisClient) {
    let parsedData;
    redisClient.get("posts", (err, data) => {
      if (err) console.log("Failed to retrieved data from Redis, Calling API");

      if (data) {
        console.log("data retrieved from redis");
        parsedData = JSON.parse(data);
      }
    });
    if (parsedData) {
      return res.status(200).send(parsedData);
    }
  }
  try {
    const response = await axios.get(`${API}/posts`);
    console.log("data retrieved from API");
    if (redisClient) {
      redisClient.setex("posts", 30, JSON.stringify(response.data), (err) => {
        if (err) {
          console.log("Failed caching response to redis");
          console.log(`error: ${err}`);
          return;
        }
        console.log("Cached response to redis");
      });
    }
    res.status(200).send(response.data);
  } catch (e) {
    console.log(`error: ${e.message}`);
    res.status(500).send("something went wrong");
  }
});

app.get("/:id", async (req, res) => {
  const { params } = req;
  const { id } = params;
  if (redisClient) {
    let parsedData;
    redisClient.get(`post-${id}`, (err, data) => {
      if (err) console.log("Failed to retrieved data from Redis, Calling API");

      if (data) {
        console.log(`Post ${id} retrieved from redis`);
        parsedData = JSON.parse(data);
      }
    });
    if (parsedData) {
      return res.status(200).send(parsedData);
    }
  }

  try {
    const response = await axios.get(`${API}/posts/${id}`);
    console.log(`retrieved post ${id} from API`);
    if (redisClient) {
      redisClient.setex(
        `post-${id}`,
        30,
        JSON.stringify(response.data),
        (err) => {
          if (err) {
            console.log("Failed caching response to redis");
            console.log(`error: ${err}`);
            return;
          }
          console.log("Cached response to redis");
        }
      );
    }
    res.status(200).send(response.data);
  } catch (e) {
    console.log(`error: ${e.message}`);
    res.status(500).send("something went wrong");
  }
});

app.use((req, res) => res.status(400).send("NotFOund"));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
