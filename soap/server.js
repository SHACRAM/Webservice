const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
const postgres = require("postgres");

require('dotenv').config();

const sql = postgres({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});


const service = {
  ProductsService: {
    ProductsPort: {
      CreateProduct: async function ({ name, about, price }, callback) {
        if (!name || !about || !price) {
          throw {
            Fault: {
              Code: {
                Value: "soap:Sender",
                Subcode: { value: "rpc:BadArguments" },
              },
              Reason: { Text: "Processing Error" },
              statusCode: 400,
            },
          };
        }
        const product = await sql`
          INSERT INTO products (name, about, price)
          VALUES (${name}, ${about}, ${price})
          RETURNING *
        `;
        callback(product[0]);
      },

      GetProducts: async function (args, callback) {
        const products = await sql`
        SELECT * FROM products`;

        callback(products)
      },

      PatchProduct: async function ({id, update}, callback){
        const keys = Object.keys(update).filter(key => update[key] !== undefined && key !== 'id')


        const product = await sql`
        UPDATE products
        SET ${sql(update, keys)}
        WHERE id = ${id}
        RETURNING *
        `
        callback(product[0]);
      },

      DeleteProduct: async function ({id}, callback){
        const product = await sql`
        DELETE FROM products WHERE id = ${id}
        RETURNING *
        `
        callback(product[0]);
      }
    },

  },
};


const server = http.createServer(function (request, response) {
  response.end("404: Not Found: " + request.url);
});
	
server.listen(8000);

const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, function () {
  console.log("SOAP server running at http://localhost:8000/products?wsdl");
});