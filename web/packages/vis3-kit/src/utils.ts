import { getPathType } from './components/Renderer/utils';

export { getPathType };

export function gid() {
  return Math.random().toString(36).substr(2)
}

/**
 * 安全地获取嵌套对象的属性值
 * 类似于lodash的get函数，支持完整的lodash路径风格
 * 
 * @param obj - 要获取属性的对象
 * @param path - 属性路径，支持多种格式:
 *   - 字符串: 'a.b.c'
 *   - 数组索引: 'a[0].b.c'
 *   - 属性中的点: 'a.b["c.d"].e'
 *   - 数组: ['a', 'b', 'c']
 * @param defaultValue - 如果属性不存在，返回的默认值
 * @returns 属性值或默认值
 * 
 * @example
 * const obj = { a: { b: { c: 3 } } };
 * get(obj, 'a.b.c'); // 3
 * get(obj, 'a.b.d', 'default'); // 'default'
 * get(obj, ['a', 'b', 'c']); // 3
 * get(obj, 'a[0].b.c'); // 数组索引访问
 * get(obj, 'a.b["c.d"].e'); // 带点的属性名访问
 */
export function get<T = any>(
  obj: any, 
  path: string | (string | number)[], 
  defaultValue?: T
): T {
  // 如果对象为null或undefined，直接返回默认值
  if (obj == null) {
    return defaultValue as T;
  }

  // 如果路径已经是数组，直接使用
  if (Array.isArray(path)) {
    return getByPathArray(obj, path, defaultValue);
  }

  // 解析复杂路径字符串为路径数组
  const keys = parsePath(path);

  return getByPathArray(obj, keys, defaultValue);
}

/**
 * 解析lodash风格的路径字符串为路径数组
 */
function parsePath(path: string): (string | number)[] {
  if (!path) return [];

  const result: (string | number)[] = [];
  let index = 0;
  const length = path.length;
  let isKey = false;
  let key = '';

  while (index < length) {
    let char = path[index];

    // 处理方括号表示法开始
    if (char === '[') {
      // 保存之前累积的键
      if (key) {
        result.push(key);
        key = '';
      }
      
      isKey = true;
      index++;
      
      // 检查是否是引号开头的属性名
      if (path[index] === '"' || path[index] === "'") {
        const quote = path[index];
        index++;
        
        // 收集引号内的所有字符作为键名
        while (index < length && path[index] !== quote) {
          key += path[index];
          index++;
        }
        
        // 跳过结束引号
        index++;
      } else {
        // 收集数字索引
        while (index < length && path[index] !== ']') {
          key += path[index];
          index++;
        }
        
        // 转换为数字
        if (/^\d+$/.test(key)) {
          result.push(parseInt(key, 10));
          key = '';
        }
      }
      
      // 跳过方括号结束符
      if (path[index] === ']') {
        index++;
      }
      
      isKey = false;
      
      // 如果不是数字索引(已经处理过)，保存累积的键
      if (key) {
        result.push(key);
        key = '';
      }
    }
    // 处理点号分隔符
    else if (char === '.') {
      // 保存之前累积的键
      if (key) {
        result.push(key);
        key = '';
      }
      index++;
    }
    // 收集普通字符作为键名
    else {
      key += char;
      index++;
    }
  }

  // 保存最后一个键
  if (key) {
    result.push(key);
  }

  return result;
}

/**
 * 使用路径数组从对象中获取属性值
 */
function getByPathArray<T = any>(
  obj: any,
  path: (string | number)[],
  defaultValue?: T
): T {
  // 如果路径为空，返回对象本身
  if (!path.length) {
    return obj as T;
  }

  let result = obj;
  
  // 遍历路径
  for (let i = 0; i < path.length; i++) {
    // 如果当前值为null或undefined，返回默认值
    if (result == null) {
      return defaultValue as T;
    }
    
    result = result[path[i]];
  }
  
  // 如果最终结果为undefined，返回默认值
  return result === undefined ? defaultValue as T : result;
}

// 把csv文件解析成json
export function parseCsv(content: string) {
  if (typeof content !== 'string') {
    return {
      headers: [],
      data: [],
    }
  }
  const lines = content.split('\n')
  const headers = lines[0].split(',')

  const data = lines.slice(1).map((line) => {
    const obj: Record<string, string | number> = {}
    line.split(',').forEach((value, index) => {
      obj[headers[index]] = value
    })
    return obj
  })

  return {
    headers,
    data,
  }
}

export function isImage(path: string) {
  return /\.(?:jpg|jpeg|png|gif|bmp|tiff|svg|webp)$/.test(path) && !path.endsWith('/')
}

export function isVideo(path: string) {
  return /\.(?:mp4|avi|flv|wmv|mov|webm)$/.test(path) && !path.endsWith('/')
}

export function isAudio(path: string) {
  return /\.(?:mp3|wav|wma|ogg|flac)$/.test(path) && !path.endsWith('/')
}

// 是否是压缩包
export function isZip(path: string) {
  return /\.(?:zip|rar|7z|tar|gz|bz2)$/.test(path) && !path.endsWith('/')
}

export function getBasename(path: string) {
  if (!path || typeof path !== 'string') {
    return ''
  }

  try {
    // 兼容path中带中文的情况
    const pathname = new URL(path).pathname
    return decodeURIComponent(pathname.split('/').pop() ?? '')
  } catch (error) {
    return ''
  }
}

export function getOffset(url: string) {
  if (typeof url !== 'string') {
    return
  }

  if (!url) {
    return
  }

  const match = url.match(/(bytes|rows)=(\d+),(\d+)/)

  if (!match) {
    return
  }

  const [, rawType, start, end] = match

  if (rawType !== 'bytes' && rawType !== 'rows') {
    return
  }

  return {
    type: rawType,
    [rawType]: Number(start),
    size: Number(end),
  }
}

export function extractBucketName(s3Path: string) {
  if (!s3Path.startsWith('s3://')) {
    return ''
  }

  return s3Path.split('s3://')[1].split('/')[0]
}
