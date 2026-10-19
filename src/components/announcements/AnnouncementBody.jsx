import { announcementDocument, blankParagraph } from '../../services/announcementContent';
import '../../styles/announcement-rich-text.css';

export default function AnnouncementBody({ announcement, compact = false }) {
  const blocks = [...announcementDocument(announcement).blocks];
  const placeholder = (block) => block?.type === 'paragraph' && block.content.every((run) => run.text === '');
  // Browser-created edge placeholders add no content; interior blank lines remain.
  if (compact) {
    while (blocks.length && placeholder(blocks[0])) blocks.shift();
    while (blocks.length && placeholder(blocks.at(-1))) blocks.pop();
  }
  const inline = (content) => content.map((run, index) => <span key={index} className={`${run.bold ? 'font-bold' : ''} ${run.italic ? 'italic' : ''}`}>{run.text}</span>);
  return <div className="announcement-rich-text break-words leading-6 text-gray-600">
    {blocks.map((block, index) => block.type === 'paragraph' ?
      <p key={index} data-empty-paragraph={blankParagraph(block) ? 'true' : undefined}>{inline(block.content)}{block.content.some((run) => run.text.length) ? null : <br />}</p> :
      block.type === 'ordered_list' ? <ol key={index} className="list-decimal space-y-1 pl-6">{block.items.map((content, i) => <li key={i}>{inline(content)}</li>)}</ol> :
        <ul key={index} className="list-disc space-y-1 pl-6">{block.items.map((content, i) => <li key={i}>{inline(content)}</li>)}</ul>)}
  </div>;
}
