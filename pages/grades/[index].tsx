import React, { useState, useEffect, useRef } from "react";
import { Spinner, Modal } from "flowbite-react";
import { useRouter } from "next/router";
import {
  parseGrades,
  updateCourse,
  addAssignment,
  delAssignment,
  updateCategory,
  Grades as GradesType,
  Course,
  genTable,
  abbreviate,
} from "../../utils/grades";
import GradeField from "../../components/GradeField";
import CategoryField from "../../components/CategoryField";
import Head from "next/head";
import { motion } from "framer-motion";

//icons
import { TbRefresh } from "react-icons/tb";
import { HiOutlineCalculator, HiOutlineDocumentAdd } from "react-icons/hi";
import { HiOutlineTrash } from "react-icons/hi";
import { BsGraphUp } from "react-icons/bs";
import CustomAd from "../../components/customAd";

interface GradesProps {
  client: any;
  grades: GradesType;
  setGrades: React.Dispatch<React.SetStateAction<GradesType | undefined>>;
  period: number;
  setPeriod: (period: number) => void;
  isMediumOrLarger: boolean;
  createError: (message: string) => void;
  ad: any;
  setAd: (ad: any) => void;
  setTime: (time: number) => void;
  timestamp: number;
  width: any;
}

interface OptimizeProps {
  [key: string]: number;
}

type FinalCalcProps = {
  desiredGrade: number; // Target overall grade you want
  finalWeight: number; // Final exam weight (% of total grade)
};

export default function Grades({
  client,
  grades,
  setGrades,
  period,
  setPeriod,
  isMediumOrLarger,
  createError,
  ad,
  setAd,
  setTime,
  timestamp,
  width,
}: GradesProps) {
  const router = useRouter();
  const { index }: { index?: string } = router.query;
  const course = grades?.courses[parseInt(index as string)];
  const [loading, setLoading] = useState(grades ? false : true);
  const [showModal, setShowModal] = useState(false);
  const [modalDetails, setModalDetails] = useState(0);
  const [modalType, setModalType] = useState("assignment");
  const [optimizeProps, setOptimizeProps] = useState<OptimizeProps>({});
  const [finalProps, setFinalProps] = useState<FinalCalcProps>({
    desiredGrade: null,
    finalWeight: null,
  });
  const [finalGradeSolution, setFinalGradeSolution] = useState(null);
  const [solutions, setSolution] = useState<[number[], number][]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(undefined);
  const assignmentTitle = useRef(null);

  useEffect(() => {
    try {
      if (!grades && client && ad !== undefined) {
        client.gradebook().then(([res, extras]) => {
          res.gradingScale = extras?.gradingScale;
          console.log(typeof index);
          let parsedGrades = parseGrades(res);
          setGrades(parsedGrades);
          setPeriod(parsedGrades.period.index);
          setLoading(false);
        });
      }
    } catch {
      if (localStorage.getItem("remember") === "false") {
        console.log("womp womp");
      }
    }
  }, [client]);

  useEffect(() => {
    const deleteLast = (event) => {
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault(); // Prevent default undo behavior if needed
        let temp = grades.courses[parseInt(index as string)];

        if (temp.assignments[0].custom == true) {
          del(0);
        }
      }
    };

    if (grades?.courses[parseInt(index as string)]?.assignments?.length > 1) {
      window.addEventListener("keydown", deleteLast);
    }
    return () => {
      window.removeEventListener("keydown", deleteLast);
    };
  }, [grades]);

  const updateGrade = (val: string, assignmentId: number, update: string) => {
    let temp = grades;
    temp.courses[parseInt(index as string)] = updateCourse(
      temp.courses[parseInt(index as string)],
      assignmentId,
      update,
      parseFloat(val)
    );
    setGrades({ ...temp });
  };

  const handleChange = (e) => setTitle(e.target.value);

  const handleTitleChange = () => {
    const newTitle =
      assignmentTitle.current.value == ""
        ? "New Assignment"
        : assignmentTitle.current.value;
    let temp = grades;
    temp.courses[parseInt(index as string)].assignments[modalDetails].name =
      newTitle;
    setGrades(temp);
    setIsEditing(false);
  };

  const add = () => {
    let temp = grades;
    temp.courses[parseInt(index as string)] = addAssignment(
      temp.courses[parseInt(index as string)]
    );
    setGrades({ ...temp });
  };

  const del = (id: number) => {
    let temp = grades;
    temp.courses[parseInt(index as string)] = delAssignment(
      temp.courses[parseInt(index as string)],
      id
    );
    setGrades({ ...temp });
  };

  const updateCat = (val: string, assignmentId: number) => {
    let temp = grades;
    temp.courses[parseInt(index as string)] = updateCategory(
      temp.courses[parseInt(index as string)],
      assignmentId,
      val
    );
    setGrades({ ...temp });
  };

  const OpenModal = (assignmnetId: number) => {
    setModalType("assignment");
    setModalDetails(assignmnetId);
    setTitle(course?.assignments[assignmnetId]?.name);
    setShowModal(true);
  };

  const update = (p: number) => {
    console.log(p);
    setLoading(true);
    client
      .gradebook(p)
      .then(([res, extra]) => {
        res.gradingScale = extra?.gradingScale;
        console.log(res);
        setGrades(parseGrades(res));
        setPeriod(p);
        setLoading(false);
      })
      .catch((err) => {
        createError(err.message);
        setLoading(false);
      });
  };

  const editTitle = () => {
    setIsEditing(true);
  };

  const optimize = () => {
    setModalType("optimize");
    let tempProps = {};
    tempProps["desiredGrade"] = course.gradingScale
      ? String(course.gradingScale[Object.keys(course.gradingScale)[0]][0])
      : 90;
    course.categories.forEach((cat) => {
      tempProps[cat.name] = cat.weight * 100;
    });
    setOptimizeProps(tempProps);
    setShowModal(true);
  };

  const updateOptimize = (val: string, field: string) => {
    setOptimizeProps((prev) => {
      return { ...prev, [field]: parseFloat(val) };
    });
  };
  const handleFocus = () => {
    if (title == "New Assignment") {
      setTitle("");
    }
  };

  const optimizeGrades = () => {
    let points = Object.values(optimizeProps);
    points.splice(0, 1);
    let results = genTable(course, optimizeProps.desiredGrade, points);
    setSolution(results);
  };

  const calcFinal = () => {
    setModalType("calcFinal");

    setFinalProps({
      desiredGrade: course.gradingScale
        ? course.gradingScale[Object.keys(course.gradingScale)[0]][0]
        : 90,
      finalWeight: 10,
    });
    setShowModal(true);
  };

  const calculateFinalGradeData = () => {
    console.log(finalProps);
    if (
      finalProps.desiredGrade === undefined ||
      finalProps.finalWeight === undefined ||
      finalProps.desiredGrade === null ||
      finalProps.finalWeight === null
    ) {
      return;
    }

    const { desiredGrade, finalWeight } = finalProps;

    if (
      desiredGrade < 1 ||
      desiredGrade > 100 ||
      finalWeight < 1 ||
      finalWeight > 100
    ) {
      return;
    }

    const courseData = grades.courses[parseInt(index as string)];
    const currentGrade = courseData.grade.raw;

    if (isNaN(currentGrade)) {
      return;
    }

    const nonFinalWeight = 100 - finalWeight;

    // Final exam grade needed to reach desired overall grade
    const requiredFinal =
      (desiredGrade - (nonFinalWeight / 100) * currentGrade) /
      (finalWeight / 100);

    const result = requiredFinal.toFixed(2);

    setFinalGradeSolution(result);
  };

  return (
    <motion.div className="p-5 md:p-10 flex-1">
      <Head>
        <title>
          {course ? `${course?.name} - Grade Melon` : "Grade Melon"}
        </title>
      </Head>
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header className="text-xl font-medium text-gray-900 dark:text-white">
          {modalType === "assignment" ? (
            isEditing ? (
              <input
                onFocus={handleFocus}
                className="border-none bg-transparent focus:outline-none focus:ring-0 p-0 text-xl font-medium"
                type="text"
                onChange={handleChange}
                ref={assignmentTitle}
                autoFocus
                onBlur={handleTitleChange}
                value={title}
              ></input>
            ) : (
              <p
                onClick={
                  course?.assignments[modalDetails]?.custom
                    ? editTitle
                    : () => {}
                }
              >
                {title}
              </p>
            )
          ) : modalType === "calcFinal" ? (
            "Final Grade Calculator"
          ) : (
            "Optimize Grade"
          )}
        </Modal.Header>
        <Modal.Body>
          {modalType === "assignment" && (
            <div id="assignment-details">
              <p className="font-bold text-black dark:text-white">Grade</p>
              <p
                className={`text-base leading-relaxed text-${course?.assignments[modalDetails]?.grade.color}-400`}
              >
                {course?.assignments[modalDetails]?.grade.letter}
                {!isNaN(course?.assignments[modalDetails]?.grade.raw) &&
                  ` (${course?.assignments[modalDetails]?.grade.raw}%)`}
              </p>
              <p className="font-bold text-black dark:text-white">Points</p>
              <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                {!isNaN(course?.assignments[modalDetails]?.points.earned)
                  ? course?.assignments[modalDetails]?.points.earned
                  : "NG"}
                /{course?.assignments[modalDetails]?.points.possible}
              </p>
              <p className="font-bold text-black dark:text-white">Date Due</p>
              <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                {course?.assignments[
                  modalDetails
                ]?.date.due.toLocaleDateString()}{" "}
              </p>
              {Boolean(course?.assignments[modalDetails]?.notes) && (
                <>
                  <p className="font-bold text-black dark:text-white">Notes</p>
                  <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                    {course?.assignments[modalDetails]?.notes}{" "}
                  </p>
                </>
              )}
              <p className="font-bold text-black dark:text-white">Category</p>
              <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                {course?.assignments[modalDetails]?.category}
              </p>
            </div>
          )}
          {modalType === "optimize" && (
            <div>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Desired Grade (1-100)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={optimizeProps?.desiredGrade}
                      onChange={(e) =>
                        updateOptimize(e.target.value, "desiredGrade")
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                      placeholder={
                        course.gradingScale
                          ? String(
                              course.gradingScale[
                                Object.keys(course.gradingScale)[1]
                              ][0]
                            )
                          : "90"
                      }
                    />
                  </div>
                </div>
                {course?.categories.map(({ name }, i) => (
                  <div key={i}>
                    <label
                      htmlFor="email"
                      className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Points Left ({name})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={optimizeProps[name]}
                        onChange={(e) => updateOptimize(e.target.value, name)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                        placeholder="50"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto shadow-md rounded-lg mt-5 border border-gray-300 dark:border-gray-600">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      {course?.categories.map(({ name }, i) => (
                        <th scope="col" className="py-3 pl-6" key={i}>
                          {name}
                        </th>
                      ))}
                      <th scope="col" className="py-3 px-6">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {solutions.map((sol, i) => (
                      <tr
                        className={`bg-${
                          i % 2 == 0 ? "white" : "gray-50"
                        } border-b dark:bg-gray-${
                          i % 2 == 0 ? 900 : 800
                        } dark:border-gray-700`}
                        key={i}
                      >
                        {course?.categories.map((cat, i) => (
                          <td scope="col" className="py-3 pl-6" key={i}>
                            {sol[0][i]} / {optimizeProps[cat.name]}
                          </td>
                        ))}
                        <td
                          scope="row"
                          className="py-4 pl-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                        >
                          {sol[1].toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                    {!solutions.length && (
                      <tr className="text-red-600 font-bold">
                        <td
                          className="text-center align-center py-3"
                          colSpan={course?.categories.length + 1}
                        >
                          No Solutions Found!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {modalType === "calcFinal" && (
            <div>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Desired Grade (1-100)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={finalProps?.desiredGrade}
                      onChange={(e) =>
                        setFinalProps((prev) => ({
                          ...prev,
                          desiredGrade: parseFloat(e.target.value),
                        }))
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                      placeholder={
                        course.gradingScale
                          ? String(
                              course.gradingScale[
                                Object.keys(course.gradingScale)[1]
                              ][0]
                            )
                          : "90"
                      }
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Final Weight (% of total grade)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={finalProps?.finalWeight}
                      onChange={(e) =>
                        setFinalProps((prev) => ({
                          ...prev,
                          finalWeight: parseFloat(e.target.value),
                        }))
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                      placeholder="10"
                    />
                  </div>
                </div>
                {finalGradeSolution !== null && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-700">
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Final Grade Needed
                    </h3>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                      {finalGradeSolution}%
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      You need to score {finalGradeSolution}% on your final exam
                      to achieve a {finalProps.desiredGrade}% overall grade.
                    </p>
                    {parseFloat(finalGradeSolution) > 100 && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                        ⚠️ This target may not be achievable with the current
                        grade and final weight.
                      </p>
                    )}
                    {parseFloat(finalGradeSolution) < 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                        ✅ You've already achieved your target grade!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {modalType === "assignment" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-gray-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  del(modalDetails);
                  setShowModal(false);
                }}
                className="rounded-lg bg-primary-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
              >
                <div className="flex gap-1 items-center">
                  <HiOutlineTrash size={"1.2rem"} />
                  Delete
                </div>
              </button>
            </div>
          )}
          {modalType === "optimize" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-gray-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
              >
                Close
              </button>
              <button
                onClick={optimizeGrades}
                className="rounded-lg bg-primary-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
              >
                Optimize
              </button>
            </div>
          )}
          {modalType === "calcFinal" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-gray-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
              >
                Close
              </button>
              <button
                onClick={calculateFinalGradeData}
                className="rounded-lg bg-primary-500 px-2.5 py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
              >
                Calculate
              </button>
            </div>
          )}
        </Modal.Footer>
      </Modal>
      {loading ? (
        <div className="flex justify-center">
          <Spinner size="xl" color="pink" />
        </div>
      ) : (
        <motion.div
          className="max-w-max"
          layout
          layoutId={`card-${course?.layoutID}`}
        >
          <motion.h1
            layoutId={`name-${course?.layoutID}`}
            layout
            className="flex flex-wrap text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1"
          >
            {course?.name}
          </motion.h1>
          <motion.p
            layoutId={`teacher-${course?.layoutID}`}
            layout
            className="text-md tracking-tight mb-2.5 text-gray-900 dark:text-white"
          >
            {course?.teacher.name}
          </motion.p>
          <motion.div
            layoutId={`grade-${course.layoutID}`}
            layout="preserve-aspect"
            className="text-xl md:text-xl mb-2.5 dark:text-white"
          >
            {course?.grade.letter}{" "}
            {!isNaN(course?.grade.raw) && `(${course?.grade.raw}%)`}
          </motion.div>
          <div className="mt-2.5 w-full bg-gray-200 rounded-full dark:bg-gray-700">
            <div
              className={`bg-${course?.grade.color}-400 text-xs md:text-sm font-medium text-left pl-2 p-0.5 leading-none rounded-full h-4 md:h-6`}
              style={{
                width: `${course?.grade.raw < 100 ? course?.grade.raw : 100}%`,
              }}
            >
              <p>Total</p>
            </div>
          </div>
          {course?.categories.map(({ name, grade, points }, i) => (
            <div
              key={i}
              className="mt-2 md:mt-3 w-full bg-gray-200 rounded-full dark:bg-gray-700 relative"
            >
              <div
                className={`bg-${grade.color}-400 text-xs md:text-sm font-medium text-left pl-2 p-0.5 leading-none rounded-full h-4 md:h-6`}
                style={{ width: `${grade.raw < 100 ? grade.raw : 100}%` }}
              >
                <p className="absolute">
                  {name} ({!isNaN(grade.raw) ? `${grade.raw}%` : "N/A"}) -{" "}
                  {Math.floor(points.earned * 100) / 100}/
                  {Math.floor(points.possible * 100) / 100}
                </p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-5 w-full">
            <button
              type="button"
              onClick={() => update(period)}
              className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm p-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            >
              <TbRefresh size={"1.3rem"} />
            </button>
            <select
              id="periods"
              value={period}
              onChange={(e) => update(parseInt(e.target.value))}
              className="block w-full p-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            >
              {grades.periods.map((period) => (
                <option value={period.index} key={period.index}>
                  {period.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={optimize}
              className=" bg-primary-500 border border-primary-500 focus:outline-none hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 font-medium rounded-lg text-sm p-2.5 dark:bg-primary-600 text-white dark:hover:bg-primary-700 dark:focus:ring-primary-400"
            >
              <BsGraphUp size={"1.3rem"} />
            </button>
            <button
              type="button"
              onClick={calcFinal}
              className=" bg-primary-500 border border-primary-500 focus:outline-none hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 font-medium rounded-lg text-sm p-2.5 dark:bg-primary-600 text-white dark:hover:bg-primary-700 dark:focus:ring-primary-400"
            >
              <HiOutlineCalculator size={"1.3rem"} />
            </button>
            <button
              type="button"
              onClick={add}
              className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm p-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            >
              <HiOutlineDocumentAdd size={"1.3rem"} />
            </button>
          </div>
          <div className="m-5" />
          <div className="flex">
            <div className="mx-auto overflow-x-auto shadow-md rounded-lg border max-w-max border-gray-200 dark:border-gray-700">
              <table className="text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th
                      scope="col"
                      className="py-3 md:pl-6 text-center md:text-left"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="py-3 md:px-6 text-center md:text-left"
                    >
                      Assignment
                    </th>
                    <th
                      scope="col"
                      className="py-3 md:px-6 pr-3 text-center md:text-left"
                    >
                      Score
                    </th>
                    <th scope="col" className="py-3 md:px-6 pr-3">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    var stopBreakingTheIndexSystems;
                    let temp = structuredClone(
                      grades.courses[parseInt(index as string)]
                    );
                    if (
                      temp?.assignments &&
                      ad &&
                      client.username != "10016976" &&
                      width < 1280 &&
                      false
                    ) {
                      stopBreakingTheIndexSystems = true; //disabled for [name-redacted]
                      temp.assignments.splice(
                        Math.floor(temp.assignments.length / 2),
                        0,
                        {
                          name: "this is where the ad should go",
                          date: { due: new Date(), assigned: new Date() },
                          category: course.categories[0].name,
                          points: { earned: 0, possible: 0 },
                          grade: { letter: "", color: "", raw: NaN },
                          custom: false,
                          included: false,
                          notes: "",
                        }
                      );
                    } else {
                      stopBreakingTheIndexSystems = false;
                    }

                    return temp?.assignments.map(
                      (
                        {
                          name,
                          date,
                          grade,
                          category,
                          points,
                          custom,
                          included,
                        },
                        i
                      ) => {
                        var trueIndex: number;
                        if (
                          i > Math.floor(course.assignments.length / 2) &&
                          ad &&
                          client.username != "10016976" &&
                          width < 1280 &&
                          stopBreakingTheIndexSystems
                        ) {
                          trueIndex = i - 1;
                        } else {
                          trueIndex = i;
                        }
                        if (name == "this is where the ad should go") {
                          return (
                            <tr
                              className={`bg-${
                                i % 2 == 0 ? "white" : "gray-50"
                              } border-b dark:bg-gray-${
                                i % 2 == 0 ? 900 : 800
                              } dark:border-gray-700`}
                              key={i}
                            >
                              <td className="p-3 " colSpan={4}>
                                <div className="flex shrink justify-center max-h-64">
                                  <CustomAd
                                    timestamp={timestamp}
                                    setTime={setTime}
                                    ad={ad}
                                    setAd={setAd}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            className={`bg-${
                              i % 2 == 0 ? "white" : "gray-50"
                            } border-b dark:bg-gray-${
                              i % 2 == 0 ? 900 : 800
                            } dark:border-gray-700`}
                            key={i}
                          >
                            <td className="py-4 md:pl-6 pl-2 text-center md:text-left">
                              {date.due.toLocaleDateString()}
                            </td>
                            <td
                              className={`py-4 md:px-6 px-3 text-center ${
                                Boolean(custom) && "text-primary-500"
                              } ${
                                !included && "text-[#4d462d]"
                              } md:text-left hover:text-${
                                included ? "black" : "gray"
                              } dark:hover:text-${
                                included ? "white" : "gray"
                              } cursor-pointer`}
                              onClick={() => OpenModal(trueIndex)}
                            >
                              {name}
                            </td>
                            <td className="py-4 md:px-6 pl-3 pr-2 text-center md:text-left">
                              <div
                                className={`flex items-center gap-2 ${
                                  included
                                    ? `text-${grade.color}-400`
                                    : "text-[#4d462d]"
                                }`}
                              >
                                <GradeField
                                  onChange={(e) =>
                                    updateGrade(
                                      e.target.value,
                                      trueIndex,
                                      "earned"
                                    )
                                  }
                                  value={points.earned}
                                />
                                <p className="">/</p>
                                <GradeField
                                  onChange={(e) =>
                                    updateGrade(
                                      e.target.value,
                                      trueIndex,
                                      "possible"
                                    )
                                  }
                                  value={points.possible}
                                />
                              </div>
                            </td>
                            <td className="py-4 md:px-6 pr-1 text-center md:text-left">
                              <CategoryField
                                value={course?.categories.findIndex(
                                  (c) => category === c.name
                                )}
                                onChange={(e) =>
                                  updateCat(e.target.value, trueIndex)
                                }
                                name={
                                  isMediumOrLarger
                                    ? category
                                    : abbreviate(category)
                                }
                              >
                                {course?.categories.map((category, x) => (
                                  <option value={x} key={x}>
                                    {category.name}
                                  </option>
                                ))}
                              </CategoryField>
                            </td>
                          </tr>
                        );
                      }
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {false && (
              <div className="hidden lg:block shrink">
                <CustomAd
                  timestamp={timestamp}
                  setTime={setTime}
                  ad={ad}
                  setAd={setAd}
                />{" "}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
