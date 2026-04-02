const { Client, Databases } = require("node-appwrite");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const fs = require("fs");

const env = fs.readFileSync(".env", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT.trim())
  .setKey(env.NEXT_APPWRITE_KEY.trim());

const database = new Databases(client);
const configuration = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV.trim()],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID.trim(),
      "PLAID-SECRET": env.PLAID_SECRET.trim(),
    },
  },
});
const plaidClient = new PlaidApi(configuration);

async function test() {
  try {
    const banks = await database.listDocuments(
      env.APPWRITE_DATABASE_ID.trim(),
      env.APPWRITE_BANK_COLLECTION_ID.trim()
    );
    if (banks.total > 0) {
      const bank = banks.documents[0];
      const response = await plaidClient.transactionsSync({
        access_token: bank.accessToken,
      });
      const added = response.data.added;
      if (added.length > 0) {
        console.log("Sample Transaction:");
        console.log("category:", added[0].category);
        console.log("personal_finance_category:", added[0].personal_finance_category);
        console.log("payment_channel:", added[0].payment_channel);
      } else {
        console.log("No transactions added yet for this bank.");
      }
    } else {
      console.log("No banks found");
    }
  } catch(e) {
    if (e.response?.data) console.log(e.response.data);
    else console.log(e);
  }
}

test();
