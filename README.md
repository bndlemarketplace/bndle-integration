#Overview
This is a reference implementation of the Bndle api flow for integration with Huboo, Shopify,
SquareSpace, Wix & WooCommerce.

##How to run locally
1. `mkdir bndleTest && cd bndleTest`
2. `git clone https://github.com/SixBerriesLtd/bndle-reference-api.git`
3. `nvm use stable` - application was built using node v14.15.3
4. `npm install`
5. `cp .env.example .env`
6. Add the necessary variables to the .env file
7. `npm run dev`

The server runs on [https://localhost:9000](https://localhost:9000) as default.