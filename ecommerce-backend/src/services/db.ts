import Datastore from 'nedb-promises'

export const db = {
  products: Datastore.create("data/db/products.db"),
  orders: Datastore.create("data/db/orders.db")
}