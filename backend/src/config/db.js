import pkg from "pg";

const { Client } = pkg;

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "hospital_db",
  password: "yourpassword",
  port: 5432,
});

client.connect();

export default client;