import ContentListCard from './ContentList'
import CsvCard from './Csv'
import HtmlCard from './Html'
import ImageCard from './Image'
import ImageListCard from './ImageList'
import JsonCard from './Json'
import MarkdownCard from './Markdown'
import RawCard from './Raw'

const renders = {
  content_list: ContentListCard,
  img_list: ImageListCard,
  html: HtmlCard,
  markdown: MarkdownCard,
  json: JsonCard,
  image: ImageCard,
  raw: RawCard,
  csv: CsvCard,
}

export default renders
