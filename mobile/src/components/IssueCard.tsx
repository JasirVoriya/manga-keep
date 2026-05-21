import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../styles/theme';
import type { ComicIssue, IssueRecord } from '../types';

type Props = {
  issue: ComicIssue;
  record: IssueRecord;
  selected?: boolean;
  width: number;
  onPress: () => void;
  onLongPress: () => void;
};

const palette = ['#9a3412', '#e11d48', '#f97316', '#f59e0b', '#7c2d12', '#be123c'];

export function IssueCard({ issue, record, selected = false, width, onPress, onLongPress }: Props) {
  const owned = record.status === 'owned';
  const wishlist = record.status === 'wishlist';
  const coverHeight = Math.max(104, width * 1.42);
  const fallbackColor = palette[issue.number % palette.length];
  const statusIcon = owned ? 'check-circle' : wishlist ? 'heart-plus' : 'book-lock-outline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${issue.label}${owned ? '，已有' : wishlist ? '，想要' : '，缺少'}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { width }, owned && styles.ownedCard]}
    >
      <View style={[styles.coverFrame, !owned && styles.dimmedFrame, wishlist && styles.wishlistFrame, selected && styles.selectedFrame]}>
        <View style={[styles.cover, { height: coverHeight, backgroundColor: fallbackColor }]}>
        {issue.cover || issue.coverUrl ? (
          <Image
            source={issue.cover ?? { uri: issue.coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallback}>
            <View style={styles.fallbackTop}>
              <MaterialCommunityIcons name="star-four-points" size={16} color="rgba(255, 255, 255, 0.78)" />
            </View>
            <View>
              <Text style={styles.brand}>{issue.displayTitle.split(' ')[0] || '漫画收藏'}</Text>
              <Text style={styles.subBrand}>MANGA SHELF</Text>
            </View>
            <View>
              <Text style={styles.issueNo}>{issue.label}</Text>
              <View style={styles.coverRule} />
            </View>
          </View>
        )}
          {!owned && <View style={styles.missingOverlay} />}
          <View style={styles.issueBand}>
            <Text style={styles.issueBandText}>{issue.number.toString().padStart(3, '0')}</Text>
          </View>
          {selected && (
            <View style={styles.selectedMark}>
              <MaterialCommunityIcons name="check-bold" size={15} color={colors.white} />
            </View>
          )}
        </View>
        <View style={[styles.statePill, owned ? styles.ownedPill : wishlist ? styles.wantPill : styles.missingPill]}>
          <MaterialCommunityIcons
            name={statusIcon}
            size={12}
            color={owned ? colors.white : wishlist ? colors.redDark : colors.muted}
          />
          <Text style={[styles.stateText, !owned && styles.missingStateText]}>{owned ? '已入库' : wishlist ? '蹲守' : '缺本'}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {issue.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  ownedCard: {
    transform: [{ translateY: -1 }],
  },
  coverFrame: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.cream,
    padding: 2,
    shadowColor: colors.shelfDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  dimmedFrame: {
    borderColor: '#dcc4ad',
    backgroundColor: '#ead7c3',
  },
  wishlistFrame: {
    borderColor: colors.red,
  },
  selectedFrame: {
    borderColor: colors.red,
    borderWidth: 2,
  },
  cover: {
    borderRadius: radii.xs,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  fallbackTop: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  brand: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  subBrand: {
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 7,
    fontWeight: '800',
  },
  issueNo: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  coverRule: {
    width: 30,
    height: 2,
    marginTop: 5,
    backgroundColor: colors.red,
  },
  missingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59, 29, 18, 0.58)',
  },
  issueBand: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 32,
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(124, 45, 18, 0.92)',
  },
  issueBandText: {
    color: colors.paperWarm,
    fontSize: 10,
    fontWeight: '900',
  },
  selectedMark: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.red,
  },
  statePill: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  ownedPill: {
    backgroundColor: colors.shelf,
  },
  wantPill: {
    backgroundColor: '#ffe4e6',
  },
  missingPill: {
    backgroundColor: '#efe1d1',
  },
  stateText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  missingStateText: {
    color: colors.ink,
  },
  title: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
