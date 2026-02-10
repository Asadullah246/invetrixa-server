
- need to save the data of user incoming path( ex: get started, from any package, or invitation )
- employee invitaion system: send email with role, create account if not exist , user can accept , decline
- invitation view system
- 
name 
product limitaion : 50 









const freePackage = {
  name: 'Free',
  type: 'fixed',
  description: 'Free package',
  price: 0,
  modules: [
    {
      module: 'products',
      limits: [
        {
          key: 'products.count',
          limit: 10,
        },
        {
          key: 'products.sell',
          limit: 10,
        },
      ],
    },
    {
      module: 'orders',
      limits: [
        {
          key: 'orders.count',
          limit: 10,
        },
      ],
    },
    {
      module: 'stock',
      limits: [
        {
          key: 'stock.move',
          limit: 20,
        },
      ],
    },
    {
      module: 'invoices',
      limits: [
        {
          key: 'invoices.count',
          limit: 10,
        },
      ],
    },
  ],
};

const payPerUse = {
  name: 'Free',
  type: 'pay-per-use',
  description: 'Free package',
  price: 0,
  modules: [
    {
      module: 'products',
      limits: [
        {
          key: 'products.count',
          limit: null,
          price: 0.01,
          description: 'Number of products',
        },
        {
          key: 'products.create',
          limit: null,
          price: 0.01,
          description: 'Number of products',
        },
      ],
    },
    {
      module: 'orders',
      limits: [
        {
          key: 'orders.count',
          limit: null,
          price: 0.01,
          description: 'Number of products',
        },
      ],
    },
    {
      module: 'stock',
      limits: [
        {
          key: 'stock.move',
          limit: null,
          price: 0.01,
          description: 'Number of products',
        },
      ],
    },
    {
      module: 'invoices',
      limits: [
        {
          key: 'invoices.count',
          limit: null,
          price: 0.01,
          description: 'Number of products',
        },
      ],
    },
  ],
};

modules :

- product
- stock
