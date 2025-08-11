'use client';

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  Chip,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  TextSnippet as TextSnippetIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NewsInputComponent, { parseContentWithImages } from './NewsInputComponent';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

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

interface HistoryItem {
  id: string;
  timestamp: number;
  inputData: InputData;
  result: NewsResponse;
  title: string; // 自动生成的简短标题
}

const NewsGeneratorApp: React.FC = () => {
  const [inputData, setInputData] = useState<InputData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newsResult, setNewsResult] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 历史记录相关状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 图片预览组件
  const ImagePreview = ({ src, alt, maxHeight = 300 }: { src: string; alt: string; maxHeight?: number }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: imageError ? '100px' : `${maxHeight}px`,
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f9f9f9',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {imageError ? (
          <Box sx={{ textAlign: 'center', color: '#666', p: 2 }}>
            <Typography variant="body2">图片加载失败</Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              {src}
            </Typography>
          </Box>
        ) : (
          <>
            {imageLoading && (
              <Box sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                color: '#666'
              }}>
                <Typography variant="body2">加载中...</Typography>
              </Box>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%',
                maxHeight: `${maxHeight}px`,
                objectFit: 'contain',
                display: imageLoading ? 'none' : 'block'
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        )}
      </Box>
    );
  };

  // 从本地存储加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('news-generator-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
      } catch (error) {
        console.error('Failed to parse history from localStorage:', error);
      }
    }
  }, []);

  // 保存历史记录到本地存储
  const saveToHistory = (inputData: InputData, result: NewsResponse) => {
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      inputData,
      result,
      title: generateHistoryTitle(inputData),
    };

    const newHistory = [historyItem, ...history].slice(0, 50); // 只保留最近50条记录
    setHistory(newHistory);
    localStorage.setItem('news-generator-history', JSON.stringify(newHistory));
  };

  // 生成历史记录标题
  const generateHistoryTitle = (data: InputData): string => {
    const content = data.AGENT_USER_INPUT;
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content || '未命名记录';
  };

  // 加载历史记录
  const loadHistoryItem = (item: HistoryItem) => {
    setInputData(item.inputData);
    setNewsResult(item.result);
    setError(null);
    setShowHistoryDetail(false); // 关闭详情弹窗
  };

  // 删除历史记录项
  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('news-generator-history', JSON.stringify(newHistory));
  };

  // 清空所有历史记录
  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('news-generator-history');
  };

  // 查看历史记录详情
  const viewHistoryDetail = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setShowHistoryDetail(true);
  };

  // 复制历史记录内容
  const copyHistoryContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

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
      
      // 保存到历史记录
      saveToHistory(data, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成新闻稿时发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 下载为TXT文件
  const handleDownloadTxt = () => {
    if (!newsResult) return;

    const element = document.createElement('a');
    const file = new Blob([newsResult.content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `新闻稿_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 下载为Word文档
  const handleDownloadWord = async () => {
    if (!newsResult) return;

    try {
      // 构建图片映射
      const imageMap: { [desc: string]: string } = {};
      
      // 添加现场图片映射
      if (inputData?.live) {
        inputData.live.forEach(item => {
          if (item && item.desc && item.url) {
            imageMap[item.desc] = item.url;
          }
        });
      }
      
      // 添加发言图片映射
      if (inputData?.quote) {
        inputData.quote.forEach(quote => {
          if (quote && quote.image && quote.desc) {
            imageMap[quote.desc] = quote.image;
          }
        });
      }

      // 处理内容，替换图片占位符并创建段落
      const processContentForWord = async (content: string) => {
        const paragraphs: Paragraph[] = [];
        const parts = content.split(/(\[\[[^\]]+\]\])/);
        
        let currentTextParts: string[] = [];
        
        for (const part of parts) {
          // 检查是否是图片占位符
          const match1 = part.match(/\[\[这里情插入"([^"]+)"\]\]/);
          const match2 = part.match(/\[\[([^\]]+)\]\]/);
          const imageDesc = match1 ? match1[1] : (match2 ? match2[1] : null);
          
          if (imageDesc && imageMap[imageDesc]) {
            try {
              // 先处理之前累积的文本
              if (currentTextParts.length > 0) {
                const textContent = currentTextParts.join('').trim();
                if (textContent) {
                  paragraphs.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: textContent,
                          size: 24, // 12pt
                        }),
                      ],
                      spacing: {
                        after: 200,
                      },
                    })
                  );
                }
                currentTextParts = [];
              }
              
              // 获取图片数据并创建图片段落
              const response = await fetch(imageMap[imageDesc]);
              const arrayBuffer = await response.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              
              paragraphs.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: uint8Array,
                      transformation: {
                        width: 400,
                        height: 300,
                      },
                      type: 'jpg',
                    })
                  ],
                  spacing: {
                    after: 200,
                  },
                })
              );
            } catch (error) {
              console.error('加载图片失败:', error);
              // 如果图片加载失败，作为文本处理
              currentTextParts.push(part);
            }
          } else if (part.trim()) {
            // 普通文本内容
            currentTextParts.push(part);
          }
        }
        
        // 处理最后剩余的文本
        if (currentTextParts.length > 0) {
          const textContent = currentTextParts.join('').trim();
          if (textContent) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: textContent,
                    size: 24, // 12pt
                  }),
                ],
                spacing: {
                  after: 200,
                },
              })
            );
          }
        }
        
        return paragraphs;
      };

      // 将内容分段处理
      const paragraphs = newsResult.content.split('\n').filter(line => line.trim() !== '');
      const docChildren = [];

      // 标题
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: newsResult.title || '新闻稿',
              bold: true,
              size: 32, // 16pt
            }),
          ],
          spacing: {
            after: 400,
          },
        })
      );

      // 处理每个段落
      for (const para of paragraphs) {
        const processedParagraphs = await processContentForWord(para);
        docChildren.push(...processedParagraphs);
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `新闻稿_${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error('生成Word文档失败:', error);
      alert('生成Word文档失败，请重试');
    }
  };

  const handleReset = () => {
    setInputData(null);
    setNewsResult(null);
    setError(null);
    // 关闭历史记录相关弹窗
    setShowHistoryDetail(false);
    setSelectedHistoryItem(null);
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

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pl: 1, pr: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* 左侧历史记录框 */}
            <Paper 
              elevation={3} 
              sx={{ 
                width: 320, 
                minWidth: 320,
                maxHeight: 'calc(100vh - 200px)', 
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: 100,
                ml: 0.5, // 距离左边一点点距离
                flexShrink: 0 // 防止被压缩
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">历史记录</Typography>
                  {history.length > 0 && (
                    <Button
                      size="small"
                      onClick={clearAllHistory}
                      color="error"
                      variant="outlined"
                    >
                      清空
                    </Button>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  共 {history.length} 条记录
                </Typography>
              </Box>
              
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {history.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                    <Typography color="text.secondary">
                      暂无历史记录
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {history.map((item) => (
                      <ListItemButton
                        key={item.id}
                        divider
                        sx={{ 
                          flexDirection: 'column', 
                          alignItems: 'flex-start', 
                          p: 2,
                          '&:hover': {
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        <Box sx={{ width: '100%', mb: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 'bold', 
                              mb: 0.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date(item.timestamp).toLocaleString('zh-CN')}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                            {item.inputData.live.length > 0 && (
                              <Chip
                                label={`${item.inputData.live.length}张图片`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {item.inputData.quote.length > 0 && (
                              <Chip
                                label={`${item.inputData.quote.length}条发言`}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 0.5, width: '100%' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => viewHistoryDetail(item)}
                            sx={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            详情
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => loadHistoryItem(item)}
                            sx={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            加载
                          </Button>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>

            {/* 右侧主要内容区域 */}
            <Box sx={{ flexGrow: 1, minWidth: 0, ml: 1 }}>
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
                <NewsInputComponent onSubmit={handleInputSubmit} initialData={inputData} isSubmitting={isLoading} />
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TextSnippetIcon />}
                        onClick={handleDownloadTxt}
                      >
                        保存为TXT
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ArticleIcon />}
                        onClick={handleDownloadWord}
                      >
                        保存为Word
                      </Button>
                    </Box>
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
                    {inputData && newsResult?.content ? 
                      parseContentWithImages(
                        newsResult.content, 
                        inputData.live || [], 
                        inputData.quote || []
                      ) :
                      <div style={{ 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        fontFamily: 'inherit', 
                        lineHeight: 1.6 
                      }}>
                        {newsResult?.content || ''}
                      </div>
                    }
                  </Paper>
                </CardContent>
              </Card>
            )}
              </Paper>
            </Box>
          </Box>
        </Container>

        {/* 历史记录详情弹窗 */}
        <Dialog
          open={showHistoryDetail}
          onClose={() => setShowHistoryDetail(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">历史记录详情</Typography>
              <IconButton onClick={() => setShowHistoryDetail(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedHistoryItem && (
              <Box sx={{ mb: 2 }}>
                {/* 基本信息 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      基本信息
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>标题:</strong> {selectedHistoryItem.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>创建时间:</strong> {new Date(selectedHistoryItem.timestamp).toLocaleString('zh-CN')}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedHistoryItem.inputData.live.length > 0 && (
                        <Chip
                          label={`${selectedHistoryItem.inputData.live.length}张图片`}
                          size="small"
                          color="primary"
                        />
                      )}
                      {selectedHistoryItem.inputData.quote.length > 0 && (
                        <Chip
                          label={`${selectedHistoryItem.inputData.quote.length}条发言`}
                          size="small"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* 输入内容 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        输入内容
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => copyHistoryContent(selectedHistoryItem.inputData.AGENT_USER_INPUT)}
                      >
                        复制
                      </Button>
                    </Box>
                    
                    {/* 输入内容预览 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        backgroundColor: '#fafafa',
                        maxHeight: 400,
                        overflow: 'auto',
                        mb: 2
                      }}
                    >
                      {parseContentWithImages(
                        selectedHistoryItem.inputData.AGENT_USER_INPUT,
                        selectedHistoryItem.inputData.live || [],
                        selectedHistoryItem.inputData.quote || []
                      )}
                    </Paper>
                    
                    {/* 原始文本内容 */}
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      原始文本内容:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: '#f5f5f5',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedHistoryItem.inputData.AGENT_USER_INPUT}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>

                {/* 图片信息 */}
                {selectedHistoryItem.inputData.live.length > 0 && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        图片信息 ({selectedHistoryItem.inputData.live.length}张)
                      </Typography>
                      {selectedHistoryItem.inputData.live.map((img, index) => (
                        <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                            图片 {index + 1}:
                          </Typography>
                          
                          {/* 图片预览 */}
                          <Box sx={{ mb: 2 }}>
                            <ImagePreview 
                              src={img.url} 
                              alt={`图片 ${index + 1}`}
                              maxHeight={300}
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>URL:</strong> {img.url}
                          </Typography>
                          {img.desc && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>描述:</strong> {img.desc}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 发言信息 */}
                {selectedHistoryItem.inputData.quote.length > 0 && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        发言信息 ({selectedHistoryItem.inputData.quote.length}条)
                      </Typography>
                      {selectedHistoryItem.inputData.quote.map((quote, index) => (
                        <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                          <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {quote.name}:
                          </Typography>
                          
                          {/* 发言人图片预览 */}
                          {quote.image && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                发言人照片:
                              </Typography>
                              <ImagePreview 
                                src={quote.image} 
                                alt={`${quote.name}的照片`}
                                maxHeight={200}
                              />
                            </Box>
                          )}
                          
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                            {quote.content}
                          </Typography>
                          {quote.desc && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>描述:</strong> {quote.desc}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 生成结果 */}
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        生成的新闻稿
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => copyHistoryContent(selectedHistoryItem.result.content)}
                        >
                          复制内容
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            loadHistoryItem(selectedHistoryItem);
                            setShowHistoryDetail(false);
                          }}
                        >
                          加载到编辑器
                        </Button>
                      </Box>
                    </Box>
                    {selectedHistoryItem.result.title && (
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {selectedHistoryItem.result.title}
                      </Typography>
                    )}
                    {selectedHistoryItem.result.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                        摘要：{selectedHistoryItem.result.summary}
                      </Typography>
                    )}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        backgroundColor: '#fafafa',
                        maxHeight: 400,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedHistoryItem.result.content}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowHistoryDetail(false)}>
              关闭
            </Button>
          </DialogActions>
        </Dialog>

        {/* 复制成功提示 */}
        <Snackbar
          open={copySuccess}
          autoHideDuration={2000}
          onClose={() => setCopySuccess(false)}
          message="复制成功!"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default NewsGeneratorApp;
