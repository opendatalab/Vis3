# Vis3

> OSS browser based on s3

A one-stop data visualization tool for the large model domain, focusing on solving complex data parsing and visualization challenges in natural language processing, machine learning, and other scenarios. The tool supports mainstream cloud platforms (S3 protocol) such as Alibaba Cloud and AWS, and is compatible with multiple formats including JSON and JSONL. Through its intelligent data structure recognition and interactive visualization capabilities, data is clearly presented in web pages, Markdown, images, and other view modes, making key fields easily visible, significantly reducing data understanding costs, and helping users quickly gain insights into data value.

## Features

- Supports multiple formats such as JSON, JSONL, WARC, intelligently recognizes data structures and visually presents key information, making data clear at a glance.

- One-click preview of any field, supports free switching between multiple view modes such as web pages, Markdown, images, simple and intuitive operation.

- Seamlessly connects with mainstream cloud storage platforms (Alibaba Cloud, AWS, Tencent Cloud, and other cloud storage platforms that support the S3 protocol), supports local file parsing, making data access easy.

<video width="100%" controls>
  <source src="intro.mp4" type="video/mp4">
</video>

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

# Default launch doesn't require login, if you want to enable login to distinguish users
vis3 --auth

# Specify database (sqlite) directory
BASE_DATA_DIR=your/database/path vis3

# Enable login through ENABLE_AUTH
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

## Web React Components

TODO

## Technical Communication

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
