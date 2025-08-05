import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 获取 Authorization header
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 }
      );
    }

    // 获取 formData
    const formData = await request.formData();
    
    // 转发请求到实际的 API
    const response = await fetch('https://xingchen-api.xf-yun.com/workflow/v1/upload_file', {
      method: 'POST',
      headers: {
        'Authorization': authorization,
      },
      body: formData,
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('上传文件 API 错误:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
