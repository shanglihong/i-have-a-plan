import { ContentBlockDO } from "../../../../../entities"

interface ImageBlockProps {
  block: ContentBlockDO
  index: number
}

export function ImageBlock({ block, index }: ImageBlockProps) {
  return (
    <div
      key={block.block_id || index}
      id={block.block_id}
      data-block-id={block.block_id}
      data-block-index={index}
      className="my-6 p-2 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center overflow-hidden"
    >
      {block.html_or_markdown ? (
        <div
          className="max-w-full overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:mx-auto"
          dangerouslySetInnerHTML={{ __html: block.html_or_markdown }}
        />
      ) : (
        <img
          src={block.text}
          alt={`图片切片 #${index + 1}`}
          className="max-w-full h-auto rounded-lg shadow-md"
        />
      )}
    </div>
  )
}
