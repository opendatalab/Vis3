<div align="center">
  <article style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
    <p align="center"><img width="300" src="./web/app/src/assets/logo.svg" /></p>
    <h1 style="width: 100%; text-align: center;"></h1>
    <p align="center">
        English | <a href="./README_zh-CN.md" >简体中文</a>
    </p>
  </article>
</div>

> OSS browser based on s3

Vis3 is a visualization tool for large language models and machine learning data, supporting cloud storage platforms with S3 protocol (AWS, Aliyun OSS, Tencent Cloud) and various data formats (json, jsonl.gz, warc.gz, md, mobi, epub, etc.). It offers interactive visualization through JSON, HTML, Markdown, and image views for efficient data analysis.

## Features

- Supports JSON, JSONL, WARC, and more, automatically recognizing data structures for clear, visual insights.
- One-click field previews with seamless switching between Html, Markdown, and image views for intuitive operation.
- Integrates with S3-compatible cloud storage (Aliyun OSS, AWS, Tencent Cloud) and local file parsing for easy data access.

https://github.com/user-attachments/assets/aa8ee5e8-c6d3-4b20-ae9d-2ceeb2eb2c41


## Getting Started

```bash
# python >= 3.9.2
pip install vis3
```

Or create a Python environment using conda:

> Install [miniconda](https://docs.conda.io/en/latest/miniconda.html)

```bash
# 1. Create Python 3.11 environment using conda
conda create -n vis3 python=3.11

# 2. Activate environment
conda activate vis3

# 3. Install vis3
pip install vis3

# 4. Launch (no authentication)
vis3 --open
```

### Upgrade to the latest version

```bash
pip install vis3 -U
```

## Variables

### `ENABLE_AUTH`

Enable authentication.

```bash
ENABLE_AUTH=1 vis3
```

### `BASE_DATA_DIR`

Specify database (SQLite) directory.

```bash
BASE_DATA_DIR=your/database/path vis3
```

### `BASE_URL`

Specity base url to the api call.

```bash
BASE_URL=/a/b/c
```

## Local Development

```bash
conda create -n vis3-dev python=3.11

# Activate virtual environment
conda activate vis3-dev

# Install poetry
# https://python-poetry.org/docs/#installing-with-the-official-installer

# Install Python dependencies
poetry install

# Install frontend dependencies (install pnpm: https://pnpm.io/installation)
cd web && pnpm install

# Build frontend assets (in web directory)
pnpm build

# Start vis3
uvicorn vis3.main:app --reload
```

## React Component [![npm](https://img.shields.io/npm/v/%40vis3/kit.svg)](https://www.npmjs.com/package/@vis3/kit)

We provide a [React component](./web/packages/vis3-kit/) via npm for customizing your data preview ui.

![](./web/packages/vis3-kit/example/screenshot.png)

```bash
npm i @vis3/kit
```

## Community

Welcome to join the Opendatalab official WeChat group!

<p align="center">
<img style="width: 400px" src="https://user-images.githubusercontent.com/25022954/208374419-2dffb701-321a-4091-944d-5d913de79a15.jpg">
</p>

## Related Projects

- [LabelU](https://github.com/opendatalab/labelU) Image / Video / Audio annotation tool  
- [LabelU-kit](https://github.com/opendatalab/labelU-Kit) Web frontend annotation kit (LabelU is developed based on this kit)
- [LabelLLM](https://github.com/opendatalab/LabelLLM) Open-source LLM dialogue annotation platform
- [Miner U](https://github.com/opendatalab/MinerU) One-stop high-quality data extraction tool

## License

This project is licensed under the [Apache 2.0 license](./LICENSE).
