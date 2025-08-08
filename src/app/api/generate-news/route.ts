import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 读取配置文件
function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    throw new Error('配置文件读取失败，请检查 config.json 文件是否存在且格式正确');
  }
}

export async function POST(request: NextRequest) {
  try {
    const jsonData = await request.json();
    
    const config = getConfig();
    const API_KEY = config["API Key"];
    const API_SECRET = config["API Secret"];
    const FLOW_ID = config["API flowid"];
    const API_URL = config["url"];
    
    if (!API_KEY || !API_SECRET || !FLOW_ID) {
      throw new Error('API 配置缺失，请检查 config.json 文件中的配置信息');
    }

    const workflowData = {
      flow_id: FLOW_ID,
      uid: "web_user_" + Date.now(),
      parameters: {
        AGENT_USER_INPUT: jsonData.AGENT_USER_INPUT || "",
        live: jsonData.live || [],
        quote: jsonData.quote || []
      },
      ext: {
        bot_id: "news_generator",
        caller: "workflow"
      },
      stream: false
    };

    // 调用星火工作流 API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${API_KEY}:${API_SECRET}`,
      },
      body: JSON.stringify(workflowData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`星火 API 响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    
    // 打印讯飞星火原始返回到终端
    console.log('=== 讯飞星火原始响应 ===');
    console.log(responseText);
    console.log('========================');
    
    let result;
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('=== 解析后的响应对象 ===');
      console.log(JSON.stringify(parsedResponse, null, 2));
      console.log('========================');
      
      if (parsedResponse.choices && parsedResponse.choices[0] && parsedResponse.choices[0].delta && parsedResponse.choices[0].delta.content) {
        const contentString = parsedResponse.choices[0].delta.content;
        console.log('=== Content 字段内容 ===');
        console.log(contentString);
        console.log('========================');
        
        const contentJson = JSON.parse(contentString);
        console.log('=== 解析后的 Content JSON ===');
        console.log(JSON.stringify(contentJson, null, 2));
        console.log('========================');
        
        // 检查是否有错误信息
        if (contentJson.error) {
          // 如果有错误，直接返回错误信息给前端处理
          return NextResponse.json({ error: contentJson.error }, { status: 400 });
        } else if (contentJson.hasOwnProperty('output')) {
          // 如果有 output 字段（即使是空字符串），正常返回
          result = {
            content: contentJson.output || "生成的内容为空",
            title: "AI 生成的新闻稿",
            summary: "基于您提供的数据，AI 为您生成的专业新闻稿"
          };
        } else {
          throw new Error(`Content JSON 中没有找到 output 字段，实际内容: ${contentString}`);
        }
      } else {
        throw new Error(`API 响应中没有找到 choices[0].delta.content 字段，实际收到: ${responseText}`);
      }
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(`JSON 解析失败: ${responseText}`);
      } else {
        throw parseError;
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('生成新闻稿时发生错误:', error);
    
    return NextResponse.json(
      { 
        error: '生成新闻稿失败', 
        details: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}
