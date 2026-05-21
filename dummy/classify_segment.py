def classify_segment_type(segment_info) :
    if segment_info["label_id"] == 3 or segment_info["label_id"] == 7 :
        return "SYMBOL"
    else :
        return "LINE"