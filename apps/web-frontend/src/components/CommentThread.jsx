import React from 'react';

export default function CommentThread({ auth, wid, itemId, canComment }){
  return (
    <div className="comments">
      <div className="a-size-small" style={{color:'var(--amz-muted)', fontStyle: 'italic'}}>
        Comments feature not available in basic version.
      </div>
    </div>
  );
}
