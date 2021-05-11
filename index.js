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
  retry_strategy: ({ attempt, total_retry_time, times_connected, error }) => {
    console.log(
      `Connection to Redis failed - error: ${error} - time passed since last connection: ${total_retry_time} - times connected: ${times_connected} - attempts to connect: ${attempt}`
    );
    console.log("Retying to connect to Redis in 1 minute");
    return 60000;
  },
});

const API = "https://jsonplaceholder.typicode.com";

app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send("main endpoint: /posts/:id");
});

app.get("/:id", (req, res) => {
  const { params } = req;
  const { id } = params;

  try {
    redisClient.get(`post-${id}`, async (err, val) => {
      if (err) throw new Error(err);
      if (val) {
        const parsedData = JSON.parse(val);
        console.log("data retrieved from redis");
        res.status(200).send(parsedData);
      } else {
        console.log("no data in redis, calling API");
        const response = await axios.get(`${API}/posts/${id}`);
        const data = response.data;
        if (data) {
          console.log("data retrieved from API");
          redisClient.setex(`post-${id}`, 30, JSON.stringify(data), (err) => {
            if (err)
              return console.log("Could not cache response to redis", err);
            console.log("cached response to redis");
          });
          return res.status(200).send(data);
        }
      }
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("something went wrong");
  }
});

app.use((req, res) => res.status(400).send("NotFOund"));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
