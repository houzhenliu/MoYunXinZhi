'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface InputData {
  AGENT_USER_INPUT: string;
  live: { url: string; desc: string }[];
  quote: QuoteItem[];
}

interface QuoteItem {
  name: string;
  image?: string;
  content: string;
  needAiSummary: number; // 0 或 1
  desc?: string; // 图片描述，用于后台返回时的标识
  customDesc?: string; // 用户自定义的图片描述
}

interface ExtendedFile extends File {
  customDesc?: string;
  uploadedUrl?: string; // 上传后的URL
}

interface NewsInputComponentProps {
  onSubmit?: (data: InputData) => void;
}

// 解析返回内容中的图片标记
export const parseContentWithImages = (
  content: string, 
  liveImages: { url: string; desc: string }[], 
  quotes: QuoteItem[]
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  
  // 构建图片映射
  const imageMap: { [desc: string]: string } = {};
  
  // 添加现场图片映射
  liveImages.forEach(item => {
    imageMap[item.desc] = item.url;
  });
  
  // 添加发言图片映射
  quotes.forEach(quote => {
    if (quote.image && quote.desc) {
      imageMap[quote.desc] = quote.image;
    }
  });
  
  // 匹配 [[这里情插入"id"]] 格式
  const pattern = /\[\[这里情插入"([^"]+)"\]\]/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;
  
  while ((match = pattern.exec(content)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      if (textPart) {
        parts.push(<span key={`text-${keyIndex++}`}>{textPart}</span>);
      }
    }
    
    // 查找对应的图片URL
    const imageDesc = match[1];
    const imageUrl = imageMap[imageDesc];
    
    if (imageUrl) {
      // 添加换行和图片
      parts.push(<br key={`br-before-${keyIndex}`} />);
      parts.push(
        <Image 
          key={`img-${keyIndex++}`}
          src={imageUrl} 
          alt={imageDesc}
          width={500}
          height={300}
          className="max-w-full h-auto my-2 rounded border"
        />
      );
      parts.push(<br key={`br-after-${keyIndex}`} />);
    } else {
      // 如果找不到图片，保留原始标记
      parts.push(<span key={`placeholder-${keyIndex++}`}>{match[0]}</span>);
    }
    
    lastIndex = pattern.lastIndex;
  }
  
  // 添加剩余的文本
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      parts.push(<span key={`text-final-${keyIndex}`}>{remainingText}</span>);
    }
  }
  
  return parts;
};

const NewsInputComponent: React.FC<NewsInputComponentProps> = ({ onSubmit }) => {
  const [textInput, setTextInput] = useState<string>('');
  const [images, setImages] = useState<ExtendedFile[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 处理文本输入
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setIsLoading(true);
      
      try {
        const newImages: ExtendedFile[] = [];
        
        for (const file of files) {
          try {
            const url = await uploadImageToServer(file);
            const extendedFile = file as ExtendedFile;
            extendedFile.uploadedUrl = url; // 保存上传后的URL
            newImages.push(extendedFile);
            console.log(`现场图片 ${file.name} 上传成功，URL: ${url}`);
          } catch (error) {
            console.error(`上传现场图片 ${file.name} 失败:`, error);
            alert(`上传现场图片 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
        
        setImages(prev => [...prev, ...newImages]);
      } catch (error) {
        console.error('处理图片上传时出错:', error);
        alert('处理图片上传时出错，请重试');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 删除图片
  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (newImages.length === 0) {
        const fileInput = document.getElementById('imageInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
      return newImages;
    });
  };

  // 添加新的发言条目
  const addQuote = () => {
    const newQuote: QuoteItem = {
      name: '',
      content: '',
      needAiSummary: 0
    };
    setQuotes(prev => [...prev, newQuote]);
  };

  // 更新发言条目
  const updateQuote = (index: number, field: keyof QuoteItem, value: string | number) => {
    setQuotes(prev => prev.map((quote, i) => 
      i === index ? { ...quote, [field]: value } : quote
    ));
  };

  // 删除发言条目
  const removeQuote = (index: number) => {
    setQuotes(prev => prev.filter((_, i) => i !== index));
  };

  // 上传发言图片
  const uploadQuoteImage = async (file: File, quoteIndex: number) => {
    try {
      const url = await uploadImageToServer(file);
      updateQuote(quoteIndex, 'image', url);
      return url;
    } catch (error) {
      console.error('上传发言图片失败:', error);
      alert('上传发言图片失败，请重试');
      throw error;
    }
  };

  // 上传单个图片文件到服务器
  const uploadImageToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 从 config.json 读取 API 配置
      const configResponse = await fetch('/config.json');
      
      if (!configResponse.ok) {
        throw new Error(`无法读取配置文件: ${configResponse.status} ${configResponse.statusText}`);
      }
      
      const config = await configResponse.json();
      console.log('配置文件内容:', config);
      
      const apiKey = config['API Key'];
      const apiSecret = config['API Secret'];
      
      if (!apiKey || !apiSecret) {
        throw new Error('API密钥未在config.json中配置');
      }

      console.log('准备上传文件:', file.name, '大小:', file.size, '类型:', file.type);
      
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}:${apiSecret}`,
        },
        body: formData,
      });

      console.log('上传响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('上传错误响应:', errorText);
        throw new Error(`文件上传失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('上传成功响应:', result);
      
      if (result.code !== 0) {
        throw new Error(`文件上传失败: ${result.message}`);
      }

      return result.data.url;
    } catch (error) {
      console.error('上传图片时出错:', error);
      
      // 检查是否是网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接或稍后重试');
      }
      
      throw error;
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!textInput.trim()) {
      alert('请输入文本内容');
      return;
    }

    // 检查是否有图片还在上传中
    const unuploadedImages = images.filter(img => !img.uploadedUrl);
    if (unuploadedImages.length > 0) {
      alert('还有图片正在上传中，请稍候再提交');
      return;
    }

    setIsLoading(true);
    
    try {
      // 为发言记录添加图片描述
      const quotesWithDesc = quotes.map(quote => ({
        name: quote.name,
        image: quote.image,
        content: quote.content,
        needAiSummary: quote.needAiSummary,
        desc: quote.image ? (quote.customDesc || `发言人${quote.name}的发言图片`) : undefined
      }));
      
      // 创建包含描述的现场图片数组（使用已上传的URL）
      const liveWithDesc = images.map((img, index) => ({
        url: img.uploadedUrl!, // 使用已上传的URL
        desc: img.customDesc || `现场图片${index + 1}号`
      }));
      
      const data: InputData = {
        AGENT_USER_INPUT: textInput,
        live: liveWithDesc,
        quote: quotesWithDesc
      };

      console.log('最终提交的数据:', {
        AGENT_USER_INPUT: data.AGENT_USER_INPUT,
        live: data.live,
        live_count: data.live.length,
        quote: data.quote,
        quote_count: data.quote.length
      });

      if (onSubmit) {
        onSubmit(data);
      }
    } catch (error) {
      console.error('处理数据时出错:', error);
      alert('处理数据时出错，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">主要内容输入</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 文本输入部分 */}
        <div>
          <label htmlFor="textInput" className="block text-sm font-medium text-gray-700 mb-2">
            主要内容和背景
          </label>
          <textarea
            id="textInput"
            value={textInput}
            onChange={handleTextChange}
            placeholder="请详细描述您的回忆内容和相关背景..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            disabled={isLoading}
          />
        </div>

        {/* 图片上传部分 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="imageInput" className="block text-sm font-medium text-gray-700">
              现场图片
            </label>
            {images.length > 0 && (
              <span className="text-sm text-gray-500">
                已选 {images.length} 张
              </span>
            )}
          </div>
          <input
            id="imageInput"
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          
          {/* 显示已选择的图片 */}
          {images.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">已选择的现场图片:</p>
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 truncate font-medium">{image.name}</span>
                      <div className="flex items-center">
                        {image.uploadedUrl ? (
                          <span className="text-xs text-green-600 mr-2">✓ 已上传</span>
                        ) : (
                          <span className="text-xs text-blue-600 mr-2">上传中...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="text-red-500 hover:text-red-700 text-sm ml-2"
                          disabled={isLoading}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    
                    {/* 图片描述设置 */}
                    <div className="mt-2">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`useDefault-${index}`}
                          checked={!image.customDesc}
                          onChange={(e) => {
                            const newImages = [...images];
                            if (e.target.checked) {
                              // 使用默认描述
                              delete newImages[index].customDesc;
                            } else {
                              // 启用自定义描述
                              newImages[index].customDesc = `现场图片${index + 1}号`;
                            }
                            setImages(newImages);
                          }}
                          className="mr-2"
                          disabled={isLoading}
                        />
                        <label htmlFor={`useDefault-${index}`} className="text-xs text-gray-600">
                          使用默认描述 &quot;现场图片{index + 1}号&quot;
                        </label>
                      </div>
                      
                      {image.customDesc !== undefined && (
                        <input
                          type="text"
                          value={image.customDesc}
                          onChange={(e) => {
                            const newImages = [...images];
                            newImages[index].customDesc = e.target.value;
                            setImages(newImages);
                          }}
                          placeholder="请输入图片描述"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 发言记录部分 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              发言记录
            </label>
            <button
              type="button"
              onClick={addQuote}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            >
              添加发言
            </button>
          </div>
          
          {quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
              暂无发言记录，点击&quot;添加发言&quot;开始添加
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote, index) => (
                <div key={index} className="p-4 border border-gray-300 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">发言 {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeQuote(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      disabled={isLoading}
                    >
                      删除
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 人名 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        人名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={quote.name}
                        onChange={(e) => updateQuote(index, 'name', e.target.value)}
                        placeholder="请输入发言人姓名"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                    
                    {/* 是否要AI概括 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        是否需要AI概括
                      </label>
                      <select
                        value={quote.needAiSummary}
                        onChange={(e) => updateQuote(index, 'needAiSummary', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                      >
                        <option value={0}>否</option>
                        <option value={1}>是</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* 发言内容 */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      发言内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={quote.content}
                      onChange={(e) => updateQuote(index, 'content', e.target.value)}
                      placeholder="请输入发言内容..."
                      rows={3}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* 发言图片 */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      发言图片 (可选)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            await uploadQuoteImage(e.target.files[0], index);
                          } catch {
                            // 错误已在 uploadQuoteImage 中处理
                          }
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                    {quote.image && (
                      <div className="mt-2">
                        <div className="flex items-center text-xs text-green-600 mb-2">
                          <span>✓ 图片已上传</span>
                          <button
                            type="button"
                            onClick={() => updateQuote(index, 'image', '')}
                            className="ml-2 text-red-500 hover:text-red-700"
                            disabled={isLoading}
                          >
                            删除图片
                          </button>
                        </div>
                        
                        {/* 发言图片描述设置 */}
                        <div className="mt-2">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`useDefaultQuote-${index}`}
                              checked={!quote.customDesc}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // 使用默认描述
                                  updateQuote(index, 'customDesc', '');
                                } else {
                                  // 启用自定义描述
                                  updateQuote(index, 'customDesc', `发言人${quote.name}的发言图片`);
                                }
                              }}
                              className="mr-2"
                              disabled={isLoading}
                            />
                            <label htmlFor={`useDefaultQuote-${index}`} className="text-xs text-gray-600">
                              使用默认描述 &quot;发言人{quote.name}的发言图片&quot;
                            </label>
                          </div>
                          
                          {quote.customDesc && (
                            <input
                              type="text"
                              value={quote.customDesc}
                              onChange={(e) => updateQuote(index, 'customDesc', e.target.value)}
                              placeholder="请输入图片描述"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isLoading}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        <div>
          <button
            type="submit"
            disabled={isLoading || !textInput.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
          >
            {isLoading ? '生成中...' : '生成新闻稿'}
          </button>
        </div>
      </form>

      {/* 数据预览 */}
      {(textInput || images.length > 0 || quotes.length > 0) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">提交数据预览:</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify({
              AGENT_USER_INPUT: textInput,
              live: images.map((img, index) => ({
                url: img.uploadedUrl || "[上传中...]",
                desc: img.customDesc || `现场图片${index + 1}号`
              })),
              quote: quotes.map(q => ({
                name: q.name,
                image: q.image || undefined,
                content: q.content,
                needAiSummary: q.needAiSummary,
                desc: q.image ? (q.customDesc || `发言人${q.name}的发言图片`) : undefined
              }))
            }, null, 2)}
          </pre>
          {(images.length > 0 || quotes.some(q => q.image)) && (
            <p className="text-xs text-gray-500 mt-2">
              注意：提交时图片将上传到服务器并获取实际访问链接
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsInputComponent;
