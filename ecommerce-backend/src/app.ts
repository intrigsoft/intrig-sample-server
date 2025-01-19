import { join } from 'node:path';
import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import product from "./routes/product";
import ordersRoutes from "./routes/orders";
import uploadRoutes from "./routes/upload";

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
    fastify,
    opts
): Promise<void> => {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'ECommerce API',
        description: 'API documentation for the eCommerce application',
        version: '1.0.0'
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json']
    }
  } as any)

  fastify.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    }
  })

  fastify.register(fastifyMultipart, {
    // attachFieldsToBody: true,
    // limits: {
    //   fileSize: 10 * 2024 * 2024
    // }
  })

  fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'data', 'uploads'),
    prefix: '/data/uploads/',
    logLevel: 'trace'
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // void fastify.register(AutoLoad, {
  //   dir: join(__dirname, 'routes'),
  //   options: opts
  // })

  fastify.register(product, {prefix: '/product'})
  fastify.register(ordersRoutes, {prefix: '/orders'})
  fastify.register(uploadRoutes, {prefix: '/upload'})
};

export default app;
export { app, options }
