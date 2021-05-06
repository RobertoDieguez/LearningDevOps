const express = require("express");
const cors = require("cors");
const redis = require("redis");
const { default: axios } = require("axios");
const { response } = require("express");

const app = express();

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-undef
const REDIS = process.env.REDIS || "localhost";

const redisClient = redis.createClient(6379, { host: REDIS });

console.log("Connecting to redis on: " + REDIS);

const API = "https://jsonplaceholder.typicode.com";

app.use(cors());

app.get("/", (req, res) => {
  try {
    redisClient.get("posts", async (err, data) => {
      if (err) throw new Error(err);

      if (data) {
        console.log("data retrieved from redis");
        res.status(200).send(JSON.parse(data));
      } else {
        const response = await axios.get(`${API}/posts`);
        if (response) {
          console.log("data retrieved from API");
          redisClient.setex("posts", 30, response.data);
          console.log("data cached in redis");
          res.status(200).send(response);
        }
      }
    });
  } catch (e) {
    res.status(500).send("Something went wrong.");
  }
});

app.get("/:id", (req, res) => {
  const { params } = req;
  const { id } = params;
  try {
    redisClient.get(`post-${id}`, async (err, data) => {
      if (err) throw new Error(err);

      if (data) {
        console.log(`Post ${id} retrieved from redis`);
        res.status(200).send(JSON.parse(data));
      } else {
        const response = await axios.get(`${API}/posts/${id}`);
        if (response) {
          console.log(`retrieved post ${id} from API`);
          redisClient.setex(`post-${id}`, 30, JSON.stringify(response.data));
          console.log("Cached response to redis");
          res.status(200).send(response.data);
        }
      }
    });
  } catch (e) {
    res.status(500).send(response);
  }
});

app.use("/", (req, res) => res.status(400).send("NotFOund"));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
