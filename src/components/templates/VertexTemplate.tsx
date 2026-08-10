
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { inkOn } from '../../utils/templateInk';

export const VertexTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  /*
   * Was a per-template copy of a YIQ brightness test with a 0.5 threshold. That
   * is not a contrast measurement: on `#718096` it chose white, at 3.5:1.
   * `inkOn` measures the real ratio and reaches for true black when near-black
   * is not enough.
   */
  const headerTextColor = inkOn(themeColor);

  return (
    <div className="p-8 bg-white text-gray-800" style={bodyStyle}>
      <header className="mb-6 text-center">
        <div className="inline-block px-8 py-4" style={{ backgroundColor: themeColor, color: headerTextColor }}>
          <div className="flex justify-center gap-2">
              <InlineEdit 
                value={personalDetails.firstName.toUpperCase()} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-extrabold tracking-widest" 
                style={titleStyle}
                tagName="h1"
                placeholder="FIRST NAME"
              />
              <InlineEdit 
                value={personalDetails.lastName.toUpperCase()} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-extrabold tracking-widest" 
                style={titleStyle}
                tagName="h1"
                placeholder="LAST NAME"
              />
          </div>
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg text-gray-600 mt-4 block" 
            style={titleStyle}
            tagName="p"
            placeholder="Job Title"
        />
        <div className="text-sm text-gray-600 mt-2 flex justify-center gap-1">
            <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            <span>|</span>
            <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto">
        <section className="mb-6">
          <h2 className="text-xl font-bold border-b-2 border-gray-300 pb-1 mb-2" style={titleStyle}>Summary</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold border-b-2 border-gray-300 pb-1 mb-3" style={titleStyle}>Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-lg font-bold block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex justify-between text-sm text-gray-600">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <div className="flex gap-1">
                      <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-1 whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-6">
            <div>
                <h2 className="text-xl font-bold border-b-2 border-gray-300 pb-1 mb-2" style={titleStyle}>Education</h2>
                {education.map((edu, index) => (
                    <div key={edu.id} className="mb-2">
                    <InlineEdit 
                        value={edu.degree} 
                        fieldId={`education[${index}].degree`} 
                        onFocus={onFocus} 
                        className="font-bold block" 
                        style={titleStyle}
                        tagName="h3"
                        placeholder="Degree"
                    />
                    <InlineEdit 
                        value={edu.school} 
                        fieldId={`education[${index}].school`} 
                        onFocus={onFocus} 
                        className="text-sm text-gray-600 block" 
                        tagName="p"
                        placeholder="School"
                    />
                    </div>
                ))}
            </div>
            <div>
                <h2 className="text-xl font-bold border-b-2 border-gray-300 pb-1 mb-2" style={titleStyle}>Skills</h2>
                <ul className="text-sm space-y-1">
                    {skills.map((skill, index) => (
                        <li key={skill.id}>
                            <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
      </main>
    </div>
  );
};
