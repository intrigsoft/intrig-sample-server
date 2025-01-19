import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../services/db';

function fixId(product: any) {
  product.id = product._id
}

export const ordersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get all orders
  fastify.get('/', {
    schema: {
      description: 'Get a list of all orders',
      tags: ['Orders'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number for pagination', default: 1 },
          size: { type: 'number', description: 'Number of items per page', default: 10 },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          description: 'List of orders',
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total number of orders' },
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  customer: { type: 'string' },
                  totalAmount: { type: 'number' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as {
      page: number;
      size: number;
    };

    const total = await db.orders.count({});
    const orders = await db.orders.find({})
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.size)
      .limit(query.size);

    reply.send({ total, orders: orders.map(fixId) });
  });

  // Get a specific order by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get details of a specific order by ID',
      tags: ['Orders'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Order ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Order details',
          type: 'object',
          properties: {
            id: { type: 'string' },
            customer: { type: 'string' },
            totalAmount: { type: 'number' },
            status: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await db.orders.findOne({ _id: id });

    if (!order) {
      reply.code(404).send({ message: 'Order not found' });
      return;
    }

    fixId(order)

    reply.send(order);
  });

  // Create a new order
  fastify.post('/', {
    schema: {
      description: 'Create a new order',
      tags: ['Orders'],
      body: {
        type: 'object',
        properties: {
          customer: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'number' },
              },
              required: ['productId', 'quantity'],
            },
          },
        },
        required: ['customer', 'items'],
      },
      response: {
        201: {
          description: 'Order created successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            customer: { type: 'string' },
            totalAmount: { type: 'number' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const order = request.body as {
      customer: string;
      items: { productId: string; quantity: number }[];
    };

    const totalAmount = order.items.reduce((total, item) => total + item.quantity * 10, 0); // Mock price calculation

    const newOrder = {
      customer: order.customer,
      items: order.items,
      totalAmount,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    const insertedOrder = await db.orders.insert(newOrder);
    fixId(insertedOrder)

    reply.code(201).send(insertedOrder);
  });

  // Delete an order by ID
  fastify.delete('/:id', {
    schema: {
      description: 'Delete an order by ID',
      tags: ['Orders'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Order ID' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Order deleted successfully',
          type: 'null',
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db.orders.remove({ _id: id }, {});

    if (result === 0) {
      reply.code(404).send({ message: 'Order not found' });
      return;
    }

    fixId(result)

    reply.code(204).send();
  });
};

export default ordersRoutes;
