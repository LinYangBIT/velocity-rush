# 素材与第三方许可

## 可再分发内容

| 内容 | 来源 / 作者 | 许可 |
| --- | --- | --- |
| `dist/vendor/three.module.js`，r169 | Three.js Authors，<https://github.com/mrdoob/three.js> | MIT；原文保存在 `dist/vendor/THREE-LICENSE.txt`，保留文件顶部版权 |
| `dist/assets/fonts/barlow-*.ttf` | The Barlow Project Authors，<https://github.com/jpt/barlow> | SIL Open Font License 1.1；原文保存在 `dist/assets/fonts/OFL.txt`，字体未修改 |
| `dist/assets/audio/sunline-drive.mp3` 与 `night-pulse.mp3` | 本项目原创、纯合成，无商业采样；可由 `scripts/build-bgm.py` 重建 | 本项目 MIT |
| 赛道几何、程序场景、路线 SVG、游戏 UI/逻辑 | 本项目原创代码 | 本项目 MIT |
| 公开版凌光赛车、头盔车手与车库 SVG | 本项目原创几何/SVG，源文件位于 `scripts/open-source/` | 本项目 MIT |

## 本地参考版中的排除项

`dist/assets/reference/` 的商业游戏截图/车辆原图、`dist/assets/classic-avatar.png` 据图重建人物、参考车型重建版 `dist/car-model.js`，均不作 MIT 再授权，独立公开导出不会包含这些文件。原图来源记录仅存在本地参考版 `dist/assets/reference/sources.json`，来源链接不是再分发许可证。

旧版 `dist/assets/tracks/*.jpg` 的来源授权记录不足，公开导出使用实际赛道几何生成的 SVG 替代；不复制这些 JPG。公开版赛车模型由独立编写的 `scripts/open-source/car-model.js` 替代，不复用参考车型轮廓。

可选音乐平台界面提供外部官方播放器/链接，不包含或下载商业音乐录音。第三方曲名/艺人信息不意味着本项目取得录音再分发权；平台访问取决于其服务条款和地区可用性。

所有商标属于相应权利人，项目许可不授予商标权。此项目不隶属于商业竞速游戏厂商。
