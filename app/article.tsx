import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, Image, Pressable } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { Text, View } from '@/components/Themed';
import { useAppContext } from '@/context/AppContext';
import { Article } from '@/lib/types';
import { formatRelativeFromNow } from '@/lib/date';

export default function ArticleScreen() {
  const params = useLocalSearchParams<Partial<{ id: string; feedId: string }>>();
  const { getArticles, toggleBookmark, setArticleRead } = useAppContext();
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const { width } = useWindowDimensions();

  useEffect(() => {
    (async () => {
      if (!params.feedId || !params.id) return;
      const list = await getArticles(String(params.feedId));
      const found = list.find((a) => a.id === params.id);
      setArticle(found);
      if (found) await setArticleRead(found, true);
    })();
  }, [params.feedId, params.id]);

  const source = useMemo(() => ({ html: article?.content ?? '' }), [article?.content]);

  if (!article) {
    return (
      <View style={styles.container}> 
        <Text>Loading article...</Text>
      </View>
    );
  }

  const onBookmark = async () => {
    await toggleBookmark(article);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="article-view"> 
      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatRelativeFromNow(article.pubDate)}</Text>
        <Pressable onPress={onBookmark}>
          <Text style={styles.bookmark} testID="bookmark-toggle">★ Bookmark</Text>
        </Pressable>
      </View>
      {article.image ? (
        <Image source={{ uri: article.image }} style={styles.image} resizeMode="cover" />
      ) : null}
      <RenderHTML source={source} contentWidth={width - 24} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: '#666' },
  bookmark: { color: '#ffcc00', fontWeight: '600' },
  image: { width: '100%', height: 200, borderRadius: 8 },
});

