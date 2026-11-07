# 评论审核词表

本目录中的词表来自开源项目 [fwwdn/sensitive-stop-words](https://github.com/fwwdn/sensitive-stop-words)，用于在服务端识别需要人工复核的评论内容。

- 上游版本：`a7d06bb1c321e669943b6841570d9da6dad8ce2b`
- 许可：Apache License 2.0，完整文本见 `LICENSE-APACHE-2.0.txt`
- 本项目部署的分类：广告、政治类、涉枪涉爆违法信息、色情类
- 本地处理：仅将源文件复制并改用英文文件名；词条内容未改动

词表仅作为评论自动审核的辅助规则。命中词表的评论会以星号遮罩后公开，并进入待审核状态；管理员可在后台查看审核原文，确认无误后解除星号。
