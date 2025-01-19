import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../services/db';

function fixId(product: any) {
  product.id = product._id
}

export const product: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get all products with optional filtering, pagination, and sorting
  fastify.get('/', {
    schema: {
      description: 'Get a list of products',
      tags: ['Products'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category' },
          minPrice: { type: 'number', description: 'Minimum price' },
          maxPrice: { type: 'number', description: 'Maximum price' },
          page: { type: 'number', description: 'Page number for pagination', default: 1 },
          size: { type: 'number', description: 'Number of items per page', default: 10 },
          sortBy: { type: 'string', description: 'Field to sort by (e.g., price)', default: 'price' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'asc' },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          description: 'List of products',
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total number of products' },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      page: number;
      size: number;
      sortBy: string;
      order: 'asc' | 'desc';
    };

    const { category, minPrice, maxPrice, page, size, sortBy, order } = query;

    const filters: any = {};
    if (category) filters.category = category;
    if (minPrice !== undefined) filters.price = { $gte: minPrice };
    if (maxPrice !== undefined) {
      filters.price = { ...filters.price, $lte: maxPrice };
    }

    const total = await db.products.count(filters);
    const products = await db.products
      .find(filters)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * size)
      .limit(size)
      .exec();

    reply.send({ total, products });
  });

  // Get a single product by ID
  fastify.get('/get/:id', {
    schema: {
      description: 'Get product details by ID',
      tags: ['Products'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Product ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Product details',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    console.log(id);
    const product = await db.products.findOne({ _id: id });

    if (!product) {
      return reply.code(404).send({ message: 'Product not found' });
    }

    fixId(product)

    reply.send(product);
  });

  // Create a new product
  fastify.post('/', {
    schema: {
      description: 'Create a new product',
      tags: ['Products'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'price', 'category'],
      },
      response: {
        201: {
          description: 'Product created successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const product = request.body as {
      name: string;
      price: number;
      category: string;
      description?: string;
    };

    const newProduct = await db.products.insert(product);
    fixId(newProduct)

    reply.code(201).send(newProduct);
  });

  // Update a product by ID
  fastify.put('/:id', {
    schema: {
      description: 'Update an existing product',
      tags: ['Products'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Product ID' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          description: { type: 'string' },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          description: 'Product updated successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updatedProduct = request.body as {
      name?: string;
      price?: number;
      category?: string;
      description?: string;
    };

    const product = await db.products.update({ _id: id }, { $set: updatedProduct }, { returnUpdatedDocs: true });

    if (!product) {
      return reply.code(404).send({ message: 'Product not found' });
    }

    fixId(product)

    reply.send(product);
  });

  // Delete a product by ID
  fastify.delete('/:id', {
    schema: {
      description: 'Delete a product',
      tags: ['Products'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Product ID' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Product deleted successfully',
          type: 'null',
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const numRemoved = await db.products.remove({ _id: id }, { multi: false });

    if (numRemoved === 0) {
      return reply.code(404).send({ message: 'Product not found' });
    }

    reply.code(204).send();
  });

  fastify.get('/search', {
    schema: {
      description: 'Search products with optional filters, pagination, and sorting',
      tags: ['Products'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category' },
          minPrice: { type: 'number', description: 'Minimum price' },
          maxPrice: { type: 'number', description: 'Maximum price' },
          search: { type: 'string', description: 'Search term (name or description)' },
          page: { type: 'number', description: 'Page number for pagination', default: 1 },
          size: { type: 'number', description: 'Number of items per page', default: 10 },
          sortBy: { type: 'string', description: 'Field to sort by (e.g., price)', default: 'price' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'asc' },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          description: 'Search results',
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total number of products' },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
      page: number;
      size: number;
      sortBy: string;
      order: 'asc' | 'desc';
    };

    const filters: any = {};
    if (query.category) filters.category = query.category;
    if (query.minPrice !== undefined) filters.price = { $gte: query.minPrice };
    if (query.maxPrice !== undefined) {
      filters.price = { ...filters.price, $lte: query.maxPrice };
    }
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filters.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const total = await db.products.count(filters);
    const products = await db.products
      .find(filters)
      .sort({ [query.sortBy]: query.order === 'asc' ? 1 : -1 })
      .skip((query.page - 1) * query.size)
      .limit(query.size)
      .exec();

    products.forEach(fixId)

    reply.send({ total, products });
  });
};

export default product;
