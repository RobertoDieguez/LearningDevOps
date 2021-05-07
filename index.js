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
    redisClient.get("posts", (err, data) => {
      if (err)
        return console.log("Failed to retrieved data from Redis, Calling API");

      if (data) {
        console.log("data retrieved from redis");
        return res.status(200).send(JSON.parse(data));
      }
    });
  }
  const response = await axios.get(`${API}/posts`);
  console.log("data retrieved from API");
  if (redisClient) {
    redisClient.setex("posts", 30, response.data);
    console.log("caching response to redis");
  }
  res.status(200).send(response);
});

app.get("/:id", async (req, res) => {
  const { params } = req;
  const { id } = params;
  if (redisClient) {
    redisClient.get(`post-${id}`, (err, data) => {
      if (err)
        return console.log("Failed to retrieved data from Redis, Calling API");

      if (data) {
        console.log(`Post ${id} retrieved from redis`);
        return res.status(200).send(JSON.parse(data));
      }
    });
  }

  const response = await axios.get(`${API}/posts/${id}`);
  console.log(`retrieved post ${id} from API`);
  if (redisClient) {
    redisClient.setex(`post-${id}`, 30, JSON.stringify(response.data));
    console.log("Caching response to redis");
  }
  res.status(200).send(response.data);
});

app.use((req, res) => res.status(400).send("NotFOund"));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
