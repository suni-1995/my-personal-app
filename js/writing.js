import {renderWritingPart as renderTimeline} from "./timeline.js";
import {renderWritingPart as renderNovels} from "./novels.js";
import {renderWritingPart as renderSns} from "./sns.js?v=pc-thread-link-fix1";
export function renderWriting(options){
 if(options.category==="timeline")return renderTimeline(options);
 if(options.category==="novels")return renderNovels(options);
 if(options.category==="posts")return renderSns(options);
}
