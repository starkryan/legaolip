import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsForwardingConfig } from '@/models';

// GET - List all forwarding configurations
export async function GET() {
  try {
    await connectDB();

    const configs = await SmsForwardingConfig.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      configs: configs
    });
  } catch (error) {
    console.error('Error fetching forwarding configs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve forwarding configurations'
    }, { status: 500 });
  }
}

// POST - Create a new forwarding configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      url,
      isActive = true,
      deviceIds = [],
      phoneNumbers = [],
      headers = {},
      retryCount = 3,
      retryDelay = 5,
      timeout = 30
    } = body;

    // Validate required fields
    if (!name || !url) {
      return NextResponse.json({
        success: false,
        error: 'Name and URL are required'
      }, { status: 400 });
    }

    await connectDB();

    // Check if configuration with same name already exists
    const existingConfig = await SmsForwardingConfig.findOne({ name });
    if (existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'A configuration with this name already exists'
      }, { status: 409 });
    }

    // Create new configuration
    const config = await SmsForwardingConfig.create({
      name,
      url,
      isActive,
      deviceIds,
      phoneNumbers,
      headers: new Map(Object.entries(headers)),
      retryCount,
      retryDelay,
      timeout
    });

    console.log(`SMS forwarding config created: ${config.name} -> ${config.url}`);

    return NextResponse.json({
      success: true,
      config
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating forwarding config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create forwarding configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}