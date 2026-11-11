import { ArrowUpRight, Database, Github } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { REPO_URL } from "../config";

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="page-head">
        <h1 className="display">关于词光</h1>
      </header>
      <dl className="credits">
        <div><dt>原项目</dt><dd><a className="link" href={REPO_URL} target="_blank" rel="noreferrer">Word Atlas · designfuchen</a></dd></div>
        <div><dt>词库</dt><dd>{atlas.count.toLocaleString()} 词 · {atlas.examples.toLocaleString()} 条例句</dd></div>
        <div><dt>代码许可</dt><dd>MIT</dd></div>
        <div><dt>内容许可</dt><dd>词库、插画、语音：CC BY 4.0</dd></div>
        <div><dt>内容来源</dt><dd>释义与例句：大语言模型；插画：图像模型</dd></div>
        <div><dt>语音</dt><dd>ElevenLabs · 英音 Alice / 美音 Sarah</dd></div>
        <div><dt>内容校验</dt><dd>结构自动校验，未经逐条人工审校</dd></div>
        <div><dt>学习算法</dt><dd>FSRS</dd></div>
        <div><dt>数据存储</dt><dd>本机 · JSON 备份</dd></div>
      </dl>
      <div className="about-actions">
        <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
          <Github size={18} /> GitHub
        </a>
        <a className="btn btn-ghost" href={`${REPO_URL}/tree/main/data`} target="_blank" rel="noreferrer">
          <Database size={18} /> 下载词库
        </a>
        <a className="btn btn-ghost" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
          项目文档 <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
}
