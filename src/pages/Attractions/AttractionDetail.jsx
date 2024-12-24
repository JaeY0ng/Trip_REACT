import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import axios from 'axios';
import './AttractionDetail.css';
import ReviewCreateModal from '../../component/ReviewCreateModal';

       
const AttractionDetail = () => {
  // 여행지 상세 정보 불러오기 
  const { locationId } = useParams();  // URL에서 locationId 파라미터를 받아옵니다.
  const [location, setLocation] = useState(null);  // 장소의 상세 정보 상태
  const [locationLoading, setLocationLoading] = useState(true);  // 로딩 상태
  
  // 근처 여행지를 불러 오는대 필요한 값
  const [latitude, setLatitude] = useState(null);  // 위도
  const [longitude, setLongitude] = useState(null);  // 경도
  const [distance, setDistance] = useState(5);  // 근처 장소를 찾을 최대 거리 (기본값: 5km)
  
  // 불러온 주위 여행지 정보
  const [targetTagName, setTargetTagName] = useState("음식");  // 예시로 "음식" 태그 필터링
  const [nearbyLocationsExcludeTag,setNearbyLocationsExcludeTag] = useState(null);
  const [nearbyLocationsIncludeTag,setNearbyLocationsIncludeTag] = useState(null);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // 불러온 리뷰 정보
  const [reviews, setReviews] = useState([]);
  const [userProfiles,setUserProfiles] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [totalReviews,setTotalReviews] = useState(null);
  // 리뷰 정렬 옵션
  const [sortReviews,setSortReviews] = useState(null);
  

  // 장소 상세 정보 요청
  useEffect(() => {
    const fetchLocationDetail = async () => {
      try {
        const response = await axios.get(`http://localhost:5050/api/locations/${locationId}`);
        setLocation(response.data);  // 받아온 장소 상세 정보를 상태에 저장
        setLatitude(response.data.latitude);  // 위도 설정
        setLongitude(response.data.longitude);  // 경도 설정
      } catch (error) {
        console.error('Error fetching location details:', error);
      } finally {
        setLocationLoading(false);  // 로딩 완료
      }
    };

    fetchLocationDetail();  // 상세 정보 요청
  }, [locationId]);  // locationId가 변경될 때마다 다시 요청

  // 근처 장소 정보 요청
  useEffect(() => {
    if (latitude && longitude) {
      const fetchNearbyLocations = async () => {
        try {
          const response = await axios.get(`http://localhost:5050/api/locations/getNearby`, {
            params: {
              latitude,
              longitude,
              distance,
              sortValue: 'googleRating',  // 구글 평점 기준으로 정렬
              sortDirection: 'desc',  // 내림차순
              targetTagName: targetTagName,
            },
          });

          // console.log(response.data)

          // locationResponseDtoExcludeTag와 locationResponseDtoIncludeTag 배열 모두에 대해 km를 m 변환
          const excludeTagLocationsWithDistance = response.data.locationResponseDtoExcludeTag
            .map((location) => ({
              ...location,
              distanceInMeters: Math.round(location.distance * 1000),
            }))
            .filter((location) => location.distanceInMeters > 0);

          const includeTagLocationsWithDistance = response.data.locationResponseDtoIncludeTag
            .map((location) => ({
              ...location,
              distanceInMeters: Math.round(location.distance * 1000),
            }))
            .filter((location) => location.distanceInMeters > 0);

          // 두 배열을 각각 상태에 저장
          setNearbyLocationsExcludeTag(excludeTagLocationsWithDistance);
          setNearbyLocationsIncludeTag(includeTagLocationsWithDistance);

        } catch (error) {
          console.error('Error fetching nearby locations:', error);
        }
      };

      fetchNearbyLocations();  // 근처 장소 요청
    }
  }, [latitude, longitude, distance]);  // 위도, 경도, 거리 변경 시마다 요청

  // 리뷰 목록 요청
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await axios.get('http://localhost:5050/reviews/getPagedReviews', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            locationId: locationId,
            page: 0, // 첫 페이지
            pageSize : 10,
            sortValue: 'reviewCreatedAt',
            sortDirection: 'desc',
          },
        });
      console.log(response);
      // 데이터 추출
      const reviewWithUserProfileDtoList =
        response.data._embedded?.reviewWithUserProfileDtoList || []; // 데이터가 없으면 빈 배열

      // 리뷰와 사용자 프로필 데이터를 분리
      const reviewList = reviewWithUserProfileDtoList.map((item) => item.reivewDto);
      const userProfileList = reviewWithUserProfileDtoList.map((item) => item.userProfileDto);

      setReviews(reviewList);
      setUserProfiles(userProfileList);

      // 전체리뷰갯수 저장
      setTotalReviews(response.data.page.totalElements);

      } catch (error) {
        console.error('Error fetching reviews:', error);
        // 오류 발생 시 빈 배열로 설정
        setReviews([]); 
        setUserProfiles([]);
      } finally {
        setReviewLoading(false);
      }
    };
    fetchReviews();
  }, [locationId, isModalOpen]); // 모달이 닫힐 때 리뷰 갱신


  // Google Maps API를 로드하는 훅
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyA8aivSxIFr9kZQa0AhBcLlwbxSlXy7ICQ',  // 발급받은 API 키 입력
  });

  // 로딩 중일 경우
  if (locationLoading) {
    return <div>Loading...</div>;
  }

  // 장소 상세 정보가 없을 경우
  if (!location) {
    return <div>No details available for this location.</div>;
  }


  return (
    <div className="attraction-detail-container">
      {/* 장소 상세 정보 표시 */}
      <h2>{location.locationName}</h2>
      <h3>{location.regionName}</h3>
      <img src={location.placeImgUrl} alt={location.locationName} />
      {/* 지도 로딩 여부 확인 */}
      {isLoaded ? (
        <GoogleMap
          center={{ lat: latitude, lng: longitude }}  // 지도 중심을 메인 장소로 설정
          zoom={15}  // 지도 확대 비율
          mapContainerStyle={{ width: '100%', height: '400px' }}  // 지도 스타일
          options={{
            disableDefaultUI: true,  // 기본 UI 요소 숨기기 (지도 컨트롤, 확대/축소 등)
            scrollwheel: false,  // 마우스 휠로 지도 이동 방지
            draggable: false,  // 지도 드래그 이동 방지
            gestureHandling: 'none',  // 제스처로 지도 이동 방지
            disableDefaultUI: true,  // 기본 UI 요소 비활성화
            clickableIcons: false,  // 기본 아이콘 클릭 방지
          }}
        >
          {/* 고정된 마커 추가 */}
          <Marker
            position={{ lat: latitude, lng: longitude }}
            draggable={false}  // 마커 이동 비활성화
          />
        </GoogleMap>
      ) : (
        <div>Loading map...</div>
      )}
      <p>{location.description}</p>
      <p>별점 평균 : {location.googleRating}</p>
      <p>총 리뷰 수 : {location.userRatingsTotal}</p>
      <p>전화번호 : {location.phoneNumber}</p>
      <p>운영 시간 : {location.openingHours}</p>
      <p>주소 : {location.formattedAddress}</p>
      <p>
        웹사이트 주소 :{' '}
        <a href={location.website} target="_blank" rel="noopener noreferrer">
          {location.website}
        </a>
      </p>

      {/* 주변장소 컨테이너 */}
      <div className="nearby-locations-container">

        {/* 태그가 포함되지 않은 근처 장소 */}
        <h4>주위의 여행지</h4>
        {nearbyLocationsExcludeTag?.length > 0 ? (
          <ul className="nearby-locations-list">
            {nearbyLocationsExcludeTag.slice(0, 4).map((nearbyLocation) => (
              <li key={nearbyLocation.locationId} className="nearby-location-item">
                <Link to={`/attractionDetail/${nearbyLocation.locationId}`} className="nearby-link">
                  <img src={nearbyLocation.placeImgUrl} alt={nearbyLocation.locationName} />
                  <h4>{nearbyLocation.locationName}</h4>
                  <p>{nearbyLocation.regionName}</p>
                  <p>별점 : {nearbyLocation.googleRating}</p>
                  <p>거리 {nearbyLocation.distanceInMeters} m</p>
                  <p className="description">
                    {nearbyLocation.description.length > 50
                      ? `${nearbyLocation.description.substring(0, 50)}...`
                      : nearbyLocation.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>태그가 포함되지 않은 장소가 없습니다.</p>
        )}

        {/* 태그가 포함된 근처 장소 */}
        <h4>주위의 음식점</h4>
        {nearbyLocationsIncludeTag?.length > 0 ? (
          <ul className="nearby-locations-list">
            {nearbyLocationsIncludeTag.slice(0, 4).map((nearbyLocation) => (
              <li key={nearbyLocation.locationId} className="nearby-location-item">
                <Link to={`/attractionDetail/${nearbyLocation.locationId}`} className="nearby-link">
                  <img src={nearbyLocation.placeImgUrl} alt={nearbyLocation.locationName} />
                  <h4>{nearbyLocation.locationName}</h4>
                  <p>{nearbyLocation.regionName}</p>
                  <p>별점 : {nearbyLocation.googleRating}</p>
                  <p>거리 {nearbyLocation.distanceInMeters} m</p>
                  <p className="description">
                    {nearbyLocation.description.length > 50
                      ? `${nearbyLocation.description.substring(0, 50)}...`
                      : nearbyLocation.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>태그가 포함된 장소가 없습니다.</p>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <ReviewCreateModal locationId={locationId} onClose={closeModal} />
        </div>
      )}

      {/* 리뷰 영역 */}
      <div className="review-container">
        <div className="review-section">
          {/* 상단 헤더 영역 */}
          <div className="review-header">
            {/*  총 리뷰수 */}
            <h3 className="review-header-title">총 리뷰 수 ({totalReviews})</h3>
            
            <div className="review-header-actions">
              {/* 좌측: 정렬 옵션 */}
              <div className="review-header-sort">
                <button className="sort-button" onClick={() => sortReviews('rating')}>
                  별점순 ▽
                </button>
                <div className="sort-divider" />
                <button className="sort-button" onClick={() => sortReviews('reviewCreatedAt')}>
                  최신순 ▽
                </button>
              </div>
              {/* 우측: 리뷰 작성 버튼 */}
              <button className="review-header-button" onClick={openModal}>
                리뷰 작성하기
              </button>
            </div>
          </div>

          {/* 2. 중간 메인 영역 */}
          <div className="review-main">
            {reviewLoading ? (
              <p>리뷰를 불러오는 중입니다...</p>
            ) : reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div key={review.reviewId} className="review-item">
                  {/* 사용자 정보 */}
                  <div className="review-user-info">
                    <div className="user-profile-img">
                      <img
                        src={userProfiles[index]?.profileImageUrl || ""}
                        // alt={`${userProfiles[index]?.userNickname || "익명"}의 프로필 이미지`}
                      />
                    </div>
                    <p className="user-nickname">{userProfiles[index].userNickname}</p>
                    <p className="review-date">
                      {new Date(review.reviewCreatedAt).toLocaleDateString()}
                    </p>
                    <p className="review-rating">
                      {"★".repeat(review.rating) + "☆".repeat(5 - review.rating)}
                    </p>
                  </div>

                  {/* 리뷰 내용 */}
                  <div className="review-content">
                    <h4 className="review-title">{review.title}</h4>
                    <p className="review-text">{review.comment}</p>
                    {/* 리뷰 이미지 */}
                    <div className="review-images">
                      {review.imageUrls.map((url, imgIndex) => (
                        <img key={imgIndex} src={url || ""} alt={`리뷰 이미지 ${imgIndex + 1}`} />
                      ))}
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <p>작성된 리뷰가 없습니다.</p>
            )}
          </div>

          {/* 3. 하단 푸터 영역 */}
          <div className="review-footer">
            <button
              onClick={() => {
                // 이전 페이지 이동 로직 추가
              }}
            >
              이전
            </button>
            {/* 페이지 번호 표시 */}
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  // 특정 페이지로 이동 로직 추가
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => {
                // 다음 페이지 이동 로직 추가
              }}
            >
              다음
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AttractionDetail;