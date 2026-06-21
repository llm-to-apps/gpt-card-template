import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return NextResponse.json(openApiSchema(publicOrigin(request)));
}

function publicOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedHost) {
    return `${publicProtocol(forwardedHost)}://${forwardedHost}`;
  }

  const url = new URL(request.url);
  const host = request.headers.get('host') ?? url.host;

  return `${publicProtocol(host)}://${host}`;
}

function publicProtocol(host: string) {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
    ? 'http'
    : 'https';
}

function openApiSchema(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'GPT Card Public API',
      version: '1.0.0',
      description:
        'Public actions for reading a GPT Card and creating consultation requests.'
    },
    servers: [
      {
        url: origin
      }
    ],
    paths: {
      '/api/public/actions/getPublicCard': {
        post: {
          operationId: 'getPublicCard',
          summary: 'Get public GPT Card data',
          description:
            'Returns the public profile, contact methods, and currently available booking slots.',
          requestBody: emptyRequestBody(),
          responses: actionResponses({
            $ref: '#/components/schemas/PublicCardResult'
          })
        }
      },
      '/api/public/actions/listAvailableSlots': {
        post: {
          operationId: 'listAvailableSlots',
          summary: 'List available consultation slots',
          description:
            'Returns public booking slots that are currently available and not booked.',
          requestBody: emptyRequestBody(),
          responses: actionResponses({
            type: 'object',
            properties: {
              tool: { type: 'string', enum: ['listAvailableSlots'] },
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/BookingSlot' }
              }
            },
            required: ['tool', 'data']
          })
        }
      },
      '/api/public/actions/checkSlotAvailability': {
        post: {
          operationId: 'checkSlotAvailability',
          summary: 'Check whether a slot is available',
          requestBody: jsonRequestBody({
            type: 'object',
            additionalProperties: false,
            properties: {
              requestedStartAt: {
                type: 'string',
                format: 'date-time',
                description: 'Requested slot start time in ISO 8601 format.'
              },
              requestedEndAt: {
                type: 'string',
                format: 'date-time',
                description: 'Requested slot end time in ISO 8601 format.'
              }
            },
            required: ['requestedStartAt', 'requestedEndAt']
          }),
          responses: actionResponses({
            type: 'object',
            properties: {
              tool: { type: 'string', enum: ['checkSlotAvailability'] },
              data: {
                type: 'object',
                properties: {
                  available: { type: 'boolean' }
                },
                required: ['available']
              }
            },
            required: ['tool', 'data']
          })
        }
      },
      '/api/public/actions/createConsultationRequest': {
        post: {
          operationId: 'createConsultationRequest',
          summary: 'Create a consultation request',
          description:
            'Books a visitor request for an available consultation slot.',
          requestBody: jsonRequestBody({
            $ref: '#/components/schemas/CreateConsultationRequestInput'
          }),
          responses: actionResponses({
            type: 'object',
            properties: {
              tool: { type: 'string', enum: ['createConsultationRequest'] },
              data: { $ref: '#/components/schemas/ConsultationRequest' }
            },
            required: ['tool', 'data']
          })
        }
      }
    },
    components: {
      schemas: {
        PublicCardResult: {
          type: 'object',
          properties: {
            tool: { type: 'string', enum: ['getPublicCard'] },
            data: { $ref: '#/components/schemas/PublicCard' }
          },
          required: ['tool', 'data']
        },
        PublicCard: {
          type: 'object',
          properties: {
            profile: { $ref: '#/components/schemas/PublicProfile' },
            availableBookingSlots: {
              type: 'array',
              items: { $ref: '#/components/schemas/BookingSlot' }
            }
          },
          required: ['profile', 'availableBookingSlots']
        },
        PublicProfile: {
          type: 'object',
          properties: {
            photoUrl: nullableString(),
            name: { type: 'string' },
            title: nullableString(),
            location: nullableString(),
            age: nullableNumber(),
            professionalProfile: { type: 'string' },
            expertise: { type: 'string' },
            casesAndResults: { type: 'string' },
            experienceAndAchievements: nullableString(),
            collaborationFormats: { type: 'string' },
            showAvailability: { type: 'boolean' },
            contacts: {
              type: 'object',
              properties: {
                phone: nullableString(),
                email: nullableString(),
                whatsapp: nullableString(),
                telegram: nullableString(),
                website: nullableString()
              }
            }
          },
          required: [
            'photoUrl',
            'name',
            'title',
            'location',
            'age',
            'professionalProfile',
            'expertise',
            'casesAndResults',
            'experienceAndAchievements',
            'collaborationFormats',
            'showAvailability',
            'contacts'
          ]
        },
        BookingSlot: {
          type: 'object',
          properties: {
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
            price: nullableNumber(),
            currency: { type: 'string' },
            booked: { type: 'boolean' }
          },
          required: ['startAt', 'endAt', 'price', 'currency', 'booked']
        },
        CreateConsultationRequestInput: {
          type: 'object',
          additionalProperties: false,
          properties: {
            requestedStartAt: { type: 'string', format: 'date-time' },
            requestedEndAt: { type: 'string', format: 'date-time' },
            visitorName: { type: 'string', minLength: 1, maxLength: 120 },
            visitorEmail: {
              type: 'string',
              format: 'email',
              maxLength: 180
            },
            visitorPhone: { type: 'string', minLength: 3, maxLength: 80 },
            requestDescription: {
              type: 'string',
              minLength: 1,
              maxLength: 2000
            }
          },
          required: [
            'requestedStartAt',
            'requestedEndAt',
            'visitorName',
            'visitorEmail',
            'visitorPhone',
            'requestDescription'
          ]
        },
        ConsultationRequest: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            requestedStartAt: { type: 'string', format: 'date-time' },
            requestedEndAt: { type: 'string', format: 'date-time' },
            visitorName: { type: 'string' },
            visitorEmail: { type: 'string' },
            visitorPhone: { type: 'string' },
            requestDescription: { type: 'string' },
            status: {
              type: 'string',
              enum: ['NEW', 'CONFIRMED', 'CANCELLED']
            },
            createdAt: { type: 'string', format: 'date-time' }
          },
          required: [
            'id',
            'requestedStartAt',
            'requestedEndAt',
            'visitorName',
            'visitorEmail',
            'visitorPhone',
            'requestDescription',
            'status',
            'createdAt'
          ]
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {}
              },
              required: ['code', 'message']
            }
          },
          required: ['error']
        }
      }
    }
  };
}

function emptyRequestBody() {
  return jsonRequestBody({
    type: 'object',
    additionalProperties: false,
    properties: {}
  });
}

function jsonRequestBody(schema: unknown) {
  return {
    required: true,
    content: {
      'application/json': {
        schema
      }
    }
  };
}

function actionResponses(successSchema: unknown) {
  return {
    '200': {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: successSchema
        }
      }
    },
    '400': errorResponse('Invalid request'),
    '404': errorResponse('Tool or resource not found'),
    '500': errorResponse('Internal error')
  };
}

function errorResponse(description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' }
      }
    }
  };
}

function nullableString() {
  return {
    type: ['string', 'null']
  };
}

function nullableNumber() {
  return {
    type: ['number', 'null']
  };
}
