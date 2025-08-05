'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NewsInputComponent, { parseContentWithImages } from './NewsInputComponent';

// 创建 Material-UI 主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

interface NewsResponse {
  content: string;
  title?: string;
  summary?: string;
}

interface QuoteItem {
  name: string;
  image?: string;
  content: string;
  needAiSummary: number;
  desc?: string;
}

interface InputData {
  AGENT_USER_INPUT: string;
  live: { url: string; desc: string }[];
  quote: QuoteItem[];
}

const NewsGeneratorApp: React.FC = () => {
  const [inputData, setInputData] = useState<InputData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newsResult, setNewsResult] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理输入组件提交的数据
  const handleInputSubmit = async (data: InputData) => {
    setInputData(data);
    setIsLoading(true);
    setError(null);

    try {
      // 发送到后端 API
      const response = await fetch('/api/generate-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // 尝试获取详细的错误信息
        try {
          const errorResult = await response.json();
          if (errorResult.error) {
            throw new Error(`${errorResult.error}: ${errorResult.details || ''}`);
          } else {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
          }
        } catch {
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
      }

      const result: NewsResponse = await response.json();
      setNewsResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成新闻稿时发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!newsResult) return;

    const element = document.createElement('a');
    const file = new Blob([newsResult.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `新闻稿_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setInputData(null);
    setNewsResult(null);
    setError(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <DescriptionIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              新闻稿生成器
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                AI 新闻稿生成器
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center">
                输入您的文本内容和图片，我们将为您生成专业的新闻稿
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* 输入组件区域 */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  1. 输入内容
                </Typography>
                <NewsInputComponent onSubmit={handleInputSubmit} />
              </CardContent>
            </Card>

            {/* 重置按钮 */}
            {(inputData || newsResult) && (
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  重新开始
                </Button>
              </Box>
            )}

            {/* 错误信息 */}
            {error && (
              <Alert severity="error" sx={{ mb: 4 }}>
                {error}
              </Alert>
            )}

            {/* 结果显示 */}
            {newsResult && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      生成的新闻稿
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownload}
                    >
                      下载文件
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {newsResult.title && (
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {newsResult.title}
                    </Typography>
                  )}
                  {newsResult.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                      摘要：{newsResult.summary}
                    </Typography>
                  )}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      backgroundColor: '#fafafa',
                      maxHeight: 500,
                      overflow: 'auto',
                    }}
                  >
                    <Box
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                      }}
                    >
                      {inputData ? 
                        parseContentWithImages(newsResult.content, inputData.live, inputData.quote) :
                        <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.6 }}>
                          {newsResult.content}
                        </Typography>
                      }
                    </Box>
                  </Paper>
                </CardContent>
              </Card>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default NewsGeneratorApp;
