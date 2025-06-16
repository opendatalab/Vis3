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

A visualization tool designed for large language models and machine learning data. It supports cloud storage platforms with S3 protocol (AWS, Alibaba Cloud) and handles various data formats (json, jsonl.gz, warc.gz, md, etc.). Interactive visualization through JSON, Html, Markdown, and image views for efficient data analysis.

## Features

- Supports multiple formats such as JSON, JSONL, WARC, intelligently recognizes data structures and visually presents key information, making data clear at a glance.

- One-click preview of any field, supports free switching between multiple view modes such as web pages, Markdown, images, simple and intuitive operation.

- Seamlessly connects with mainstream cloud storage platforms (Alibaba Cloud, AWS, Tencent Cloud, and other cloud storage platforms that support the S3 protocol), supports local file parsing, making data access easy.

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

# 4. Launch
vis3

# ----------------

# Default launch doesn't require authentication, if you want to enable authentication to distinguish users
vis3 --auth

# Specify database (sqlite) directory
BASE_DATA_DIR=your/database/path vis3

# Enable authentication through ENABLE_AUTH
ENABLE_AUTH=true vis3
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

## React Component

We provide a [standalone React component](./web/packages/vis3-kit/) via npm for customizing your data preview ui.

## Community

Welcome to join the Opendatalab official WeChat group!

<p align="center">
<img style="width: 400px" src="https://user-images.githubusercontent.com/25022954/208374419-2dffb701-321a-4091-944d-5d913de79a15.jpg">
</p>

## Related Projects

- [LabelU-kit](https://github.com/opendatalab/labelU-Kit) Web frontend annotation kit (LabelU is developed based on this kit)
- [LabelLLM](https://github.com/opendatalab/LabelLLM) Open-source LLM dialogue annotation platform
- [Miner U](https://github.com/opendatalab/MinerU) One-stop high-quality data extraction tool

## License

This project is licensed under the [Apache 2.0 license](./LICENSE).
