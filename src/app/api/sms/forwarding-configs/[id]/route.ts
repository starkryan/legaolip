import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsForwardingConfig } from '@/models';

// GET - Get a specific forwarding configuration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const config = await SmsForwardingConfig.findById(id).lean();

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Forwarding configuration not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching forwarding config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve forwarding configuration'
    }, { status: 500 });
  }
}

// PUT - Update a forwarding configuration
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      url,
      isActive,
      deviceIds,
      phoneNumbers,
      headers,
      retryCount,
      retryDelay,
      timeout
    } = body;

    await connectDB();

    const config = await SmsForwardingConfig.findById(id);

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Forwarding configuration not found'
      }, { status: 404 });
    }

    // Check if another config with the same name exists
    if (name && name !== config.name) {
      const existingConfig = await SmsForwardingConfig.findOne({
        name,
        _id: { $ne: id }
      });
      if (existingConfig) {
        return NextResponse.json({
          success: false,
          error: 'A configuration with this name already exists'
        }, { status: 409 });
      }
    }

    // Update configuration
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (deviceIds !== undefined) updateData.deviceIds = deviceIds;
    if (phoneNumbers !== undefined) updateData.phoneNumbers = phoneNumbers;
    if (headers !== undefined) updateData.headers = new Map(Object.entries(headers));
    if (retryCount !== undefined) updateData.retryCount = retryCount;
    if (retryDelay !== undefined) updateData.retryDelay = retryDelay;
    if (timeout !== undefined) updateData.timeout = timeout;

    const updatedConfig = await SmsForwardingConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    console.log(`SMS forwarding config updated: ${updatedConfig?.name}`);

    return NextResponse.json({
      success: true,
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating forwarding config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update forwarding configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a forwarding configuration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const config = await SmsForwardingConfig.findByIdAndDelete(id);

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Forwarding configuration not found'
      }, { status: 404 });
    }

    console.log(`SMS forwarding config deleted: ${config.name}`);

    return NextResponse.json({
      success: true,
      message: 'Forwarding configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting forwarding config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete forwarding configuration'
    }, { status: 500 });
  }
}